import * as vscode from "vscode";
import * as child_process from "child_process";
import { ShellCommandOptions } from "./ShellCommandOptions";
import { VariableResolver, Input } from "./VariableResolver";
import { ShellCommandException } from "../util/exceptions";
import { UserInputContext } from "./UserInputContext";
import { QuickPickItem } from "./QuickPickItem";
import { parseBoolean } from "./options";

function promisify<T extends unknown[], R>(fn: (...args: [...T, (err: Error | null, stdout: string, stderr: string) => void]) => R) {
    return (...args: [...T]) =>
        new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            fn(...args, (err: Error | null, stdout: string, stderr: string) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
}

export class CommandHandler {
    protected args: ShellCommandOptions;
    protected EOL = /\r\n|\r|\n/;
    protected context: vscode.ExtensionContext;
    protected userInputContext: UserInputContext;
    protected input: Input;
    protected command: string;
    protected commandArgs: string[] | undefined;
    protected subprocess: typeof child_process;

    constructor(args: { [key: string]: unknown },
                userInputContext: UserInputContext,
                context: vscode.ExtensionContext,
                subprocess: typeof child_process,
    ) {
        this.args = CommandHandler.resolveArgs(args);
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

    static resolveArgs(args: { [key: string]: unknown }): ShellCommandOptions {
        return {
            useFirstResult: parseBoolean(args.useFirstResult, false),
            useSingleResult: parseBoolean(args.useSingleResult, false),
            rememberPrevious: parseBoolean(args.rememberPrevious, false),
            allowCustomValues: parseBoolean(args.allowCustomValues, false),
            warnOnStderr: parseBoolean(args.warnOnStderr, true),
            multiselect: parseBoolean(args.multiselect, false),
            multiselectSeparator: args.multiselectSeparator ?? " ",
            stdio: ["stdout", "stderr", "both"].includes(args.stdio as string) ? args.stdio : "stdout",
            ...args,
        } as ShellCommandOptions;
    }

    protected async resolveArgs() {
        const resolver = new VariableResolver(
            this.input,
            this.userInputContext,
            this.context,
            this.getDefault().join(this.args.multiselectSeparator));

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

    // Get the result, either by showing a dropdown or taking the first / only
    // option
    async getResult() {
        await this.resolveArgs();

        const result = await this.runCommand();
        const nonEmptyInput = this.parseResult(result);
        const useFirstResult =
            this.args.useFirstResult ||
            (this.args.useSingleResult && nonEmptyInput.length === 1);

        if (useFirstResult) {
            const result = nonEmptyInput[0].value;
            return [result];
        } else {
            const selectedItems = await this.quickPick(nonEmptyInput);
            return selectedItems;
        }
    }

    async handle() {
        const selectedItems = await this.getResult();

        if (selectedItems === undefined) {
            return;
        }

        if (this.args.rememberPrevious && this.args.taskId) {
            this.setDefault(this.args.taskId, selectedItems);
        }

        const result = selectedItems.join(this.args.multiselectSeparator!);

        this.userInputContext.recordInputByInputId(this.input.id, result);
        this.userInputContext.recordInputByTaskId(this.args.taskId, result);

        return result;
    }

    protected async runCommand() {
        const options: child_process.ExecSyncOptionsWithStringEncoding = {
            encoding: "utf8",
            cwd: this.args.cwd,
            env: this.args.env,
            maxBuffer: this.args.maxBuffer,
            //    shell: vscode.env.shell
        };

        if (this.commandArgs !== undefined) {
            const execFile = promisify(this.subprocess.execFile);
            return await execFile(this.command, this.commandArgs, options);
        } else {
            const exec = promisify<[string, child_process.ExecOptionsWithStringEncoding], child_process.ChildProcess>(this.subprocess.exec);
            return exec(this.command, options);
        }
    }

    protected parseResult(commandOutput: { stdout: string, stderr: string }): QuickPickItem[] {
        const stdout = commandOutput.stdout.trim();
        const stderr = commandOutput.stderr.trim();
        let items: string[] = [];

        if (("stdout" == this.args.stdio) || ("both" == this.args.stdio)) {
            items.push(...stdout.split(this.EOL));
        }

        if (("stderr" == this.args.stdio) || ("both" == this.args.stdio)) {
            items.push(...stderr.split(this.EOL));
        }

        items = items.filter(item => item !== "");

        if ((items.length == 0) && (undefined === this.args.defaultOptions)) {
            let msg = `The command for input '${this.input.id}' returned empty result.`;

            if (stderr) {
                msg += ` stderr: '${stderr}'`;
            }

            throw new ShellCommandException(msg);
        }

        if ((this.args.warnOnStderr) && ("stdout" == this.args.stdio) && stderr) {
            vscode.window.showWarningMessage(
                `The command for input '${this.input.id}' might have errors.
                 stderr: '${stderr}'.
                 Hint: You can disable this with '"warnOnStderr": false'.`);
        }

        return items
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
            const result = this.context.workspaceState
                .get<string | string[]>(this.args.taskId, []);

            // Backwards compatibilty for before multiselect when default was
            // saved as string not array.
            return (typeof result === "string") ? [result] : result;
        }

        return [];
    }

    protected async setDefault(id: string, values: string[]) {
        await this.context.workspaceState.update(id, values);
    }

    /**
     * Transform the slected items in the quickpick list
     */
    static transformSelection(picker: vscode.QuickPick<vscode.QuickPickItem> | undefined) {
        return picker?.selectedItems.map(
            (item) => (item as QuickPickItem).value);
    }

    protected async quickPick(input: QuickPickItem[]) {
        if (input.length === 0) {
            input = this.args.defaultOptions?.map((option) => ({
                value: option,
                label: option,
            })) ?? [];
        }

        const defaultValues = this.getDefault();
        let disposable: vscode.Disposable;

        return new Promise<string[] | undefined>((resolve) => {
            const picker = vscode.window.createQuickPick();
            picker.canSelectMany = this.args.multiselect!;
            picker.matchOnDescription = true;
            picker.matchOnDetail = true;

            if (this.args.description !== undefined) {
                picker.placeholder = this.args.description;
            }

            // Compute all constant (non custom) picker items.
            const constantItems = input.map((item) => ({
                label: item.label,
                description: (!this.args.multiselect &&
                              defaultValues.includes(item.value))
                    ? `${item.description} (Default)`
                    : item.description,
                detail: item.detail,
                value: item.value,
            } as vscode.QuickPickItem));

            const disposableLikes = [
                picker,

                picker.onDidAccept(() => {
                    const result = CommandHandler.transformSelection(picker);

                    if (undefined !== result) {
                        resolve(result);
                    }
                }),

                picker.onDidHide(() => {
                    const didCancelQuickPickSession =
                        picker?.selectedItems?.length === 0;
                    const result = CommandHandler.transformSelection(picker);

                    if (didCancelQuickPickSession) {
                        resolve(undefined);
                    } else if (this.input.id && (undefined !== result)) {
                        resolve(result);
                    } else {
                        console.log(`onDidHide for ${this.args.taskId} got to else branch.`);
                    }
                }),
            ];

            if (this.args.allowCustomValues) {
                // Cache item labels to save some work on keypress.
                const itemLabels = input.map((item) => item.label);

                disposableLikes.push(picker.onDidChangeValue(() => {
                    // Vscode API has no mechanism to detect visible items.
                    // The best we can do is check if it's not exactly equal to an existing item.
                    if (picker.value !== "" && !itemLabels.includes(picker.value)) {
                        // There's no more efficient way to do this.
                        // Vscode doesn't update unless we give it a new object.
                        picker.items = [...constantItems, {
                            label: picker.value,
                            value: picker.value,
                            description: "(Custom)",
                        } as vscode.QuickPickItem];
                    } else {
                        picker.items = constantItems;
                    }
                }));
            }

            disposable = vscode.Disposable.from(...disposableLikes);

            picker.items = constantItems;

            const activeItems = [...picker.items.filter(
                (item) => defaultValues.includes((item as QuickPickItem).value))];

            // Assigning unconditionally can break selectedItems in callbacks
            // See #112
            if (activeItems.length) {
                if (this.args.multiselect) {
                    picker.selectedItems = activeItems;
                } else {
                    picker.activeItems = activeItems;
                }
            }

            picker.show();
        }).finally(() => {
            if (disposable) {
                disposable.dispose();
            }
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
