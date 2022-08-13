import * as vscode from "vscode";
import * as subprocess from "child_process";
import * as path from "path";

export const InputCommandIdentifier = "shell.exec";

export function activate(this: any, context: vscode.ExtensionContext) {
    const cache = new Cache();

    context.subscriptions.push(
        vscode.commands.registerCommand(InputCommandIdentifier, createCallback(cache), this),
    );

    // Triggers a reset of the userInput context
    context.subscriptions.push(vscode.tasks.onDidStartTask(cache.reset));
    context.subscriptions.push(vscode.debug.onDidStartDebugSession(cache.reset));
}

// this method is called when your extension is deactivated
export function deactivate() {}

// Cache stores input value for a single session
class Cache {
    protected store: Map<string, string>;
    constructor() {
        this.store = new Map<string, string>();
    }

    reset(): void {
        this.store.clear();
    }

    set(id: string, taskValue: string): void {
        this.store.set(id, taskValue);
    }

    has(id: string): boolean {
        return this.store.has(id);
    }

    get(id: string): string {
        return this.store.get(id)!;
    }
}

interface NameValuePair {
    name: string;
    value: string;
}

// Options is the `.inputs[].args` for shell.exec
interface Options {
    cwd: string | undefined;
    command: string;
    env?: NameValuePair[];
    useFirstResult?: boolean;
    useSingleResult?: boolean;
    fieldSeparator?: string;
    description?: string;
    maxBuffer?: number;
    taskId?: string;
    defaultOptions?: [string];
}

function createCallback(cache: Cache) {
    return async (opts: Options): Promise<string> => {
        try {
            const allInputs = findAllInputs();

            const inputId = allInputs.filter(
                (x) => x && x.args && x.args.command && x.args.command == opts.command,
            )[0]?.id;

            console.debug(`on shell command callback inputId=${inputId} args=${opts}`);
            return await runShellCommand(cache, inputId, opts, allInputs);
        } catch (error) {
            cache.reset();

            console.error(error);
            vscode.window.showErrorMessage(`${InputCommandIdentifier}: ${error}`);
        }

        return "";
    };
}

function findAllInputs(): any[] {
    let inputs: any[] = [];
    if (vscode.workspace.workspaceFolders) {
        vscode.workspace.workspaceFolders?.forEach(function (folder) {
            const launchInputs =
                vscode.workspace.getConfiguration("launch", folder.uri).get("inputs") || [];
            const taskInputs =
                vscode.workspace.getConfiguration("tasks", folder.uri).get("inputs") || [];
            const workspaceLaunchInputs =
                vscode.workspace.getConfiguration("launch").get("inputs") || [];
            const workspaceTaskInputs =
                vscode.workspace.getConfiguration("tasks").get("inputs") || [];
            inputs = inputs.concat(launchInputs);
            inputs = inputs.concat(taskInputs);
            inputs = inputs.concat(workspaceLaunchInputs);
            inputs = inputs.concat(workspaceTaskInputs);
        });
    }

    return inputs;
}

async function runShellCommand(
    ctx: Cache,
    inputId: string,
    opts: Options,
    allInputs: any[],
): Promise<string> {
    if (!opts || !opts.command) {
        throw new Error('Please specify the "command" property.');
    }

    const command = await expandText(ctx, opts.command, allInputs);
    if (command === undefined) {
        throw new Error("Your command is badly formatted and variables could not be resolved");
    } else {
        opts.command = command;
    }

    if (opts.env) {
        for (let i = 0; i < opts.env.length; i++) {
            opts.env[i].name = (await expandText(ctx, opts.env[i].name, allInputs)) || "";
            opts.env[i].value = (await expandText(ctx, opts.env[i].value, allInputs)) || "";
        }
    }

    opts.cwd = opts.cwd
        ? await expandText(ctx, opts.cwd!, allInputs)
        : vscode.workspace.workspaceFolders![0].uri.fsPath;

    const result = runSubprocess(opts);
    const nonEmptyInput = parseResult(opts, result);
    const useFirstResult =
        opts.useFirstResult || (opts.useSingleResult && nonEmptyInput.length === 1);
    if (useFirstResult) {
        if (inputId && ctx) {
            ctx.set(inputId, nonEmptyInput[0].value);
        }
        return nonEmptyInput[0].value;
    } else {
        return await quickPick(ctx, inputId, opts, nonEmptyInput);
    }
}

function runSubprocess(opts: Options) {
    // copy existing env
    const processEnv: { [key: string]: string } = {};
    for (const k in process.env) {
        processEnv[k] = process.env[k]!;
    }

    // override with custom env
    opts.env?.forEach((x) => (processEnv[x.name] = x.value));

    const options: subprocess.ExecSyncOptionsWithStringEncoding = {
        encoding: "utf8",
        cwd: opts.cwd,
        env: processEnv,
        maxBuffer: opts.maxBuffer,
        //    shell: vscode.env.shell
    };

    return subprocess.execSync(opts.command!, options);
}

const EOL = /\r\n|\r|\n/;

interface Item {
    value: string;
    label?: string;
    description?: string;
    detail?: string;
}

function parseResult(opts: Options, result: string) {
    return result
        .split(EOL)
        .map((value: string) => {
            const values = value.trim().split(opts.fieldSeparator!, 4);
            return {
                value: values[0],
                label: values[1] ?? value,
                description: values[2],
                detail: values[3],
            };
        })
        .filter((item: Item) => item.label && item.label.trim().length > 0);
}

async function quickPick(
    cache: Cache,
    inputId: string,
    args: Options,
    candidates: any[],
): Promise<string> {
    if (candidates.length == 0) {
        candidates = args.defaultOptions ?? [];
    }

    const pickOpts: vscode.QuickPickOptions = {
        canPickMany: false,
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: args.description,
    };

    const x = (await vscode.window.showQuickPick(candidates, pickOpts)) as Item;

    if (!x) {
        cache.reset();
        throw new Error("quick pick canceled");
    } else if (inputId) {
        console.debug(`quick pick selected ${x.value}`);
        cache.set(inputId, x.value);
        return x.value;
    }

    return "";
}

const expressionRegex = /\$\{(.*?)\}/gm;
const workspaceRegex = /workspaceFolder\[(\d+)\]/gm;
const configVarRegex = /config:(.+)/m;
const envVarRegex = /env:(.+)/m;
const inputVarRegex = /input:(.+)/m;
const commandVarRegex = /command:(.+)/m;

async function expandText(cache: Cache, str: string, allInputs: any[]) {
    console.debug("expandText start:", str);
    const jobs: Job[] = [];

    let result = str.replace(expressionRegex, (_: string, value: string): string => {
        if (workspaceRegex.test(value)) {
            return bindIndexedFolder(value);
        }
        if (configVarRegex.test(value)) {
            return bindWorkspaceConfigVariable(value);
        }
        if (envVarRegex.test(value)) {
            return bindEnvVariable(value);
        }
        if (inputVarRegex.test(value)) {
            const x = bindInputVariable(cache, value, allInputs);
            if (x.value) {
                return x.value;
            }

            jobs.push(x);
            return _;
        }
        if (commandVarRegex.test(value)) {
            const x = bindCommandVariable(value);
            if (x.value) {
                return x.value;
            }

            jobs.push(x);
            return _;
        }
        return bindConfiguration(value);
    });

    // ensure order of jobs
    const data: string[] = [];
    for (let i = 0; i < jobs.length; i++) {
        let result = "";
        const job = jobs[i];
        if (job.command) {
            console.debug(`handle cmd job: ${job.command!}`);
            result = await vscode.commands.executeCommand(job.command!!);
        } else if (job.inputId) {
            console.debug(`handle shell cmd job: ${job.inputId!} ${job.opts!}`);
            result = await runShellCommand(cache, job.inputId!, job.opts!, allInputs);
            cache.set(job.inputId, result);
        } else {
            continue;
        }

        data.push(result);
    }

    result = result.replace(expressionRegex, () => data.shift() ?? "");
    console.debug("expandText done:", result);
    return result === "" ? undefined : result;
}

interface Job {
    command?: string;

    inputId?: string;
    opts?: Options;

    value?: string;
}

function bindCommandVariable(value: string): Job {
    const match = commandVarRegex.exec(value);
    if (!match) return { value: "" };
    return {
        command: match[1],
    };
}

function bindIndexedFolder(value: string): string {
    return value.replace(workspaceRegex, (_: string, index: string): string => {
        const idx = Number.parseInt(index);
        if (
            vscode.workspace.workspaceFolders !== undefined &&
            vscode.workspace.workspaceFolders![idx]
        ) {
            return vscode.workspace.workspaceFolders![idx]!.uri.fsPath;
        }
        return "";
    });
}

function bindConfiguration(value: string): string {
    switch (value) {
        case "workspaceFolder":
            return vscode.workspace.workspaceFolders![0].uri.fsPath;
        case "workspaceFolderBasename":
            return vscode.workspace.workspaceFolders![0].name;
        case "fileBasenameNoExtension":
            if (vscode.window.activeTextEditor !== null) {
                const filePath = path.parse(vscode.window.activeTextEditor!.document.fileName);
                return filePath.name;
            }
            return "";
        case "fileBasename":
            if (vscode.window.activeTextEditor !== null) {
                const filePath = path.parse(vscode.window.activeTextEditor!.document.fileName);
                return filePath.base;
            }
            return "";
        case "file":
            return vscode.window.activeTextEditor !== null
                ? vscode.window.activeTextEditor!.document.fileName
                : "";
        case "extension":
            if (vscode.window.activeTextEditor !== null) {
                const filePath = path.parse(vscode.window.activeTextEditor!.document.fileName);
                return filePath.ext;
            }
            return "";
        case "fileDirName":
            return vscode.window.activeTextEditor !== null
                ? path.dirname(vscode.window.activeTextEditor!.document.uri.fsPath)
                : "";
    }

    return "";
}

function bindWorkspaceConfigVariable(value: string): string {
    const matchResult = configVarRegex.exec(value);
    if (!matchResult) {
        return "";
    }
    // Get value from workspace configuration "settings" dictionary
    const workspaceResult = vscode.workspace.getConfiguration().get(matchResult[1], "");
    if (workspaceResult) {
        return workspaceResult;
    }

    const activeFolderResult = vscode.workspace
        .getConfiguration("", vscode.window.activeTextEditor?.document.uri)
        .get(matchResult[1], "");
    if (activeFolderResult) {
        return activeFolderResult;
    }

    for (const w of vscode.workspace.workspaceFolders!) {
        const currentFolderResult = vscode.workspace
            .getConfiguration("", w.uri)
            .get(matchResult![1], "");
        if (currentFolderResult) {
            return currentFolderResult;
        }
    }
    return "";
}

function bindEnvVariable(value: string): string {
    const result = envVarRegex.exec(value);
    if (!result) {
        return "";
    }

    return process.env[result[1]] || "";
}

function bindInputVariable(ctx: Cache, value: string, allInputs: any[]): Job {
    const result = inputVarRegex.exec(value);
    if (!result) {
        return { value: "" };
    }

    const inputId = result[1];
    if (ctx.has(inputId)) {
        return { value: ctx.get(inputId) };
    }

    // TODO: invoke other commands by looking up all extensions
    // vscode.extensions.all.find((x) => {
    //     x.packageJSON;
    //     return false;
    // });

    // not recorded, resolve input
    const dep = allInputs.filter(
        (x) => x && x.id && x.command && x.id === inputId && x.command === InputCommandIdentifier,
    )[0];
    if (!dep) {
        console.error(`Unhandled dependent input ${inputId}`);
        return { value: `\${input:${inputId}}` };
    }

    console.info(
        `Expand dependent ${InputCommandIdentifier} input: id=${inputId}, opts=${dep.args}`,
    );

    return {
        inputId: dep.id,
        opts: dep.args,
    };
}
