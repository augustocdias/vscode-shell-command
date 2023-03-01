import * as vscode from "vscode";
import * as subprocess from "child_process";
import { ShellCommandOptions } from "./ShellCommandOptions";
import { VariableResolver } from "./VariableResolver";
import { ShellCommandException } from "../util/exceptions";
import { UserInputContext } from "./UserInputContext";
import { QuickPickItem } from "./QuickPickItem";

export class CommandHandler {
    protected args: ShellCommandOptions;
    protected EOL = /\r\n|\r|\n/;
    protected context: vscode.ExtensionContext;
    protected userInputContext: UserInputContext;
    protected inputId?: string;

    constructor(args: ShellCommandOptions, userInputContext: UserInputContext, context: vscode.ExtensionContext) {
        if (!Object.prototype.hasOwnProperty.call(args, "command")) {
            throw new ShellCommandException('Please specify the "command" property.');
        }
        this.inputId = this.resolveCommandToInputId(args.command, args.taskId);

        this.userInputContext = userInputContext;
        this.args = args;
        this.context = context;
    }

    protected async resolveArgs() {
        const resolver = new VariableResolver();

        const command = await resolver.resolve(this.args.command, this.userInputContext);
        if (command === undefined) {
            throw new ShellCommandException(
                "Your command is badly formatted and variables could not be resolved",
            );
        } else {
            this.args.command = command;
        }

        if (this.args.rememberPrevious && this.args.taskId == undefined) {
            throw new ShellCommandException(
                "You need to specify a taskId when using rememberPrevious=true",
            );
        }

        if (this.args.env !== undefined) {
            for (const key in this.args.env ?? []) {
                if (Object.prototype.hasOwnProperty.call(this.args.env, key)) {
                    this.args.env[key] =
                        (await resolver.resolve(this.args.env[key], this.userInputContext)) || "";
                }
            }
        }

        this.args.cwd = this.args.cwd
            ? await resolver.resolve(this.args.cwd ?? '', this.userInputContext)
            : vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    }

    async handle() {
        await this.resolveArgs();

        const result = this.runCommand();
        const nonEmptyInput = this.parseResult(result);
        const useFirstResult =
            this.args.useFirstResult || (this.args.useSingleResult && nonEmptyInput.length === 1);
        if (useFirstResult) {
            if (this.inputId && this.userInputContext) {
                this.userInputContext.recordInput(this.inputId, nonEmptyInput[0].value);
            }
            return nonEmptyInput[0].value;
        } else {
            return this.quickPick(nonEmptyInput);
        }
    }

    protected runCommand() {
        const options: subprocess.ExecSyncOptionsWithStringEncoding = {
            encoding: "utf8",
            cwd: this.args.cwd,
            env: this.args.env,
            maxBuffer: this.args.maxBuffer,
            //    shell: vscode.env.shell
        };
        return subprocess.execSync(this.args.command, options);
    }

    protected parseResult(result: string): QuickPickItem[] {
        return result
            .split(this.EOL)
            .map<QuickPickItem>((value: string) => {
                const values = value.trim().split(this.args.fieldSeparator as string, 4);
                return {
                    value: values[0],
                    label: values[1] ?? value,
                    description: values[2],
                    detail: values[3],
                };
            })
            .filter((item: QuickPickItem) => item.label && item.label.trim().length > 0);
    }

    protected getDefault(id: string) {
		return this.context.workspaceState.get<string>(id, "");
	}

	protected async setDefault(id: string, value: string) {
		await this.context.workspaceState.update(id, value);
	}

    protected async quickPick(input: QuickPickItem[]) {
        if (input.length === 0) {
            input = this.args.defaultOptions?.map(o => {
                return {
                    value: o,
                    label: o
                };
            }) ?? [];
        }

        let defaultValue = '';
        if (this.args.rememberPrevious && this.args.taskId) {
            defaultValue = this.getDefault(this.args.taskId);
        }

        return new Promise<string | undefined>((resolve) => {
            const picker = vscode.window.createQuickPick();
            picker.canSelectMany = false;
            picker.matchOnDescription = true;
            picker.matchOnDetail = true;

            if (this.args.description !== undefined) {
                picker.placeholder = this.args.description;
            }

            const disposable = vscode.Disposable.from(
                picker,
                picker.onDidAccept(() => {
                    resolve((picker.selectedItems[0] as QuickPickItem).value);
                    disposable.dispose();
                }),

                picker.onDidHide(() => {
                    const didCancelQuickPickSession = picker?.selectedItems?.length === 0 ?? true;
                    if (didCancelQuickPickSession) {
                        this.userInputContext.reset();
                        resolve(undefined);
                    } else if (this.inputId)  {
                        const selection = (picker.selectedItems[0] as QuickPickItem).value;
                        this.userInputContext.recordInput(this.inputId, selection);
                        if (this.args.rememberPrevious && this.args.taskId) {
                            this.setDefault(this.args.taskId, selection);
                        }
                        resolve(selection);
                    }
                    disposable.dispose();
                }),
            );

            picker.items = input.map(
                (item) =>
                    ({
                        label: item.label,
                        description: item.value === defaultValue ? `${item.description} (Default)` : item.description,
                        detail: item.detail,
                        value: item.value,
                    } as vscode.QuickPickItem),
            );

            for (const item of picker.items) {
                if ((item as QuickPickItem).value === defaultValue) {
                    picker.activeItems = [item];
                    break;
                }
            }

            picker.show();
        });
    }

    protected resolveCommandToInputId(cmd: string | undefined, taskId: string | undefined) {
        // Lookup the inputId from the supplied command input string
        if (!cmd) { return undefined; }

        let inputs: any[] = [];
        if (vscode.workspace.workspaceFolders) {
            vscode.workspace.workspaceFolders?.forEach(function (folder) {
                const launchInputs = vscode.workspace.getConfiguration("launch", folder.uri).inspect("inputs");
                const taskInputs = vscode.workspace.getConfiguration("tasks", folder.uri).inspect("inputs");
                inputs = inputs.concat(launchInputs?.workspaceFolderValue || []);
                inputs = inputs.concat(taskInputs?.workspaceFolderValue || []);
            });
        }

        const launchInputs = vscode.workspace.getConfiguration("launch").inspect("inputs");
        const taskInputs = vscode.workspace.getConfiguration("tasks").inspect("inputs");
        inputs = inputs.concat(launchInputs?.workspaceValue || []);
        inputs = inputs.concat(launchInputs?.globalValue || []);
        inputs = inputs.concat(taskInputs?.workspaceValue || []);
        inputs = inputs.concat(taskInputs?.globalValue || []);

        return inputs.filter(
            (input) => input?.args?.command === cmd && input?.args?.taskId === taskId,
        )[0]?.id;
    }
}
