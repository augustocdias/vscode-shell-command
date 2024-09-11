import * as vscode from "vscode";
import * as child_process from "child_process";
import { ShellCommandOptions } from "./ShellCommandOptions";
import { VariableResolver, Input } from "./VariableResolver";
import { ShellCommandException } from "../util/exceptions";
import { UserInputContext } from "./UserInputContext";
import { QuickPickItem } from "./QuickPickItem";

export class CommandHandler {
    protected args: ShellCommandOptions;
    protected EOL = /\r\n|\r|\n/;
    protected context: vscode.ExtensionContext;
    protected userInputContext: UserInputContext;
    protected input: Input;
    protected command: string;
    protected commandArgs: string[] | undefined;
    protected subprocess: typeof child_process;

    constructor(args: object,
                userInputContext: UserInputContext,
                context: vscode.ExtensionContext,
                subprocess: typeof child_process,
    ) {
        this.args = this.resolveBooleanArgs(args);
        if (!Object.prototype.hasOwnProperty.call(this.args, "command")) {
            throw new ShellCommandException('Please specify the "command" property.');
        }

        const command = CommandHandler.resolveCommand(this.args.command);

        if (typeof command !== "string") {
            throw new ShellCommandException(
                'The "command" property should be a string or an array of ' +
                `string but got "${typeof command}".`
            );
        }

        if (!(this.args.commandArgs === undefined || Array.isArray(this.args.commandArgs))) {
            throw new ShellCommandException(
                'The "commandArgs" property should be an array of strings ' +
                `(if defined) but got "${typeof this.args.commandArgs}".`
            );
        }

        this.command = command;
        this.commandArgs = this.args.commandArgs as string[] | undefined;

        this.input = this.resolveTaskToInput(this.args.taskId);

        this.userInputContext = userInputContext;
        this.context = context;
        this.subprocess = subprocess;
    }

    protected resolveBooleanArgs(args: object): ShellCommandOptions {
        const opt = args as ShellCommandOptions;
        const resolvedBooleans = {
            useFirstResult: this.parseBoolean(opt.useFirstResult, false),
            useSingleResult: this.parseBoolean(opt.useSingleResult, false),
            rememberPrevious: this.parseBoolean(opt.rememberPrevious, false),
        };
        return {...args, ...resolvedBooleans} as ShellCommandOptions;
    }

    protected parseBoolean(value: unknown, defaultValue: boolean): boolean {
        if (value === undefined) {
            return defaultValue;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            if (value.toLowerCase() === 'true') {
                return true;
            } else if (value.toLowerCase() === 'false') {
                return false;
            }
        }
        vscode.window.showWarningMessage(`Cannot parse the boolean value: ${value}, use the default: ${defaultValue}`);
        return defaultValue;
    }

    protected async resolveArgs() {
        const resolver = new VariableResolver(
            this.input, this.userInputContext, this.getDefault());

        const command = await resolver.resolve(this.command);
        if (command === undefined) {
            throw new ShellCommandException(
                "Your command is badly formatted and variables could not be resolved",
            );
        } else {
            this.command = command;
        }

        if (this.commandArgs !== undefined) {
            for (const i in this.commandArgs) {
                const item = await resolver.resolve(this.commandArgs[i]);

                if (item === undefined) {
                    throw new ShellCommandException(
                        `"commandArgs" element at index ${i} is invalid.`);
                } else {
                    this.commandArgs[i] = item;
                }
            }
        }

        if (this.args.rememberPrevious && this.args.taskId === undefined) {
            throw new ShellCommandException(
                "You need to specify a taskId when using rememberPrevious=true",
            );
        }

        if (this.args.env !== undefined) {
            for (const key in this.args.env ?? []) {
                if (Object.prototype.hasOwnProperty.call(this.args.env, key)) {
                    this.args.env[key] = (await resolver.resolve(this.args.env[key])) || "";
                }
            }
        }

        this.args.cwd = this.args.cwd
            ? await resolver.resolve(this.args.cwd ?? '')
            : vscode.workspace.workspaceFolders?.[this.input.workspaceIndex].uri.fsPath;
    }

    async handle() {
        await this.resolveArgs();

        const result = this.runCommand();
        const nonEmptyInput = this.parseResult(result);
        const useFirstResult =
            this.args.useFirstResult || (this.args.useSingleResult && nonEmptyInput.length === 1);
        if (useFirstResult) {
            if (this.input.id && this.userInputContext) {
                this.userInputContext.recordInput(this.input.id, nonEmptyInput[0].value);
            }
            return nonEmptyInput[0].value;
        } else {
            return this.quickPick(nonEmptyInput);
        }
    }

    protected runCommand() {
        const options: child_process.ExecSyncOptionsWithStringEncoding = {
            encoding: "utf8",
            cwd: this.args.cwd,
            env: this.args.env,
            maxBuffer: this.args.maxBuffer,
            //    shell: vscode.env.shell
        };

        if (this.commandArgs !== undefined) {
            return this.subprocess.execFileSync(this.command, this.commandArgs, options);
        } else {
            return this.subprocess.execSync(this.command, options);
        }
    }

    protected parseResult(result: string): QuickPickItem[] {
        if (result.trim().length == 0) {
            throw new ShellCommandException(`The command for input '${this.input.id}' returned empty result.`);
        }
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

    protected getDefault() {
        if (this.args.rememberPrevious && this.args.taskId) {
            return this.context.workspaceState.get<string>(this.args.taskId, "");
        }
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

        const defaultValue = this.getDefault();

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
                    } else if (this.input.id)  {
                        const selection = (picker.selectedItems[0] as QuickPickItem).value;
                        this.userInputContext.recordInput(this.input.id, selection);
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

    // The command can be given as a string or array of strings.
    static resolveCommand(command: unknown) {
        return Array.isArray(command) ? command.join(' ') : command;
    }

    // Compare two `commandArgs` parameters.
    // Returns true if they're both undefined or both the same array.
    static compareCommandArgs(a: string[] | undefined, b: string[] | undefined) {
        if (Array.isArray(a)) {
            return Array.isArray(b) &&
                a.length == b.length &&
                a.every((element, index) => element === b[index]);
        }
        return a === undefined && b === undefined;
    }

    protected resolveTaskToInput(taskId: string | undefined) {

        // Find all objects where command is shellCommand.execute nested anywhere in the input object.
        // It could be that the actual input being run is nested inside an input from another extension.
        // See https://github.com/augustocdias/vscode-shell-command/issues/79
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function *deepSearch(obj: { command?: string, [x: string]: any }): Generator<Input> {
            if (obj?.command === "shellCommand.execute") {
                yield obj as Input;
            }
            for (const value of Object.values(obj)) {
                if (typeof value === 'object') {
                    yield* deepSearch(value);
                }
            }
        }

        function* getSectionInputs(section: "launch" | "tasks", folder?: vscode.WorkspaceFolder) {
            const keys = folder
                ? ["workspaceFolderValue"] as const
                : ["workspaceValue", "globalValue"] as const;

            for (const key of keys) {
                const conf = vscode.workspace.getConfiguration(section, folder?.uri);
                const env = conf.inspect<{ env: Record<string, string> }>("options")?.[key]?.env ?? {};
                for (const input of conf.inspect<Input[]>("inputs")?.[key] || []) {

                    // Go through all the nested shellCommand.execute inputs.
                    for (const shellInput of deepSearch(input)) {
                        // Yield the input and assign the workspaceIndex.
                        yield { ...shellInput, workspaceIndex: folder?.index ?? 0, env };
                    }
                }
            }
        }

        function* getAllInputs() {
            for (const folder of vscode.workspace.workspaceFolders ?? []) {
                yield* getSectionInputs("launch", folder);
                yield* getSectionInputs("tasks", folder);
            }
            yield* getSectionInputs("launch");
            yield* getSectionInputs("tasks");
        }

        // Go through the generator and return the first match
        for (const input of getAllInputs()) {
            const command = CommandHandler.resolveCommand(input?.args?.command);
            if (command === this.command && input?.args?.taskId === taskId &&
                CommandHandler.compareCommandArgs(this.commandArgs, input?.args?.commandArgs)) {
                return input;
            }
        }

        throw new ShellCommandException(`Could not find input with command '${this.command}' and taskId '${taskId}'.`);
    }
}
