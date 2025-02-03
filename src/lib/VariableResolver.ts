import * as vscode from 'vscode';
import * as path from 'path';
import * as querystring from 'querystring';

import { UserInputContext } from './UserInputContext';
import { parseBoolean } from './options';

export type Input = {
    command: "shellCommand.execute";
    args: {
        taskId: string;
        command: string | string[];
        commandArgs: string[] | undefined;
        cwd: string;
        env: Record<string, string>;
        completeInput: boolean | undefined;
    },
    id: string;
    type: string;
    workspaceIndex: number;
    env: Record<string, string>;
}

type PromptOptions = {
    rememberPrevious: boolean;
    prompt?: string;
}

function zip<A, B>(a: A[], b: B[]): [A, B][] {
    return a.map(function(e, i) {
        return [e, b[i]];
    });
}

function resolvePromptOptions(queryString: string): PromptOptions {
    const parsed = querystring.decode(queryString);
    return {
        prompt: (typeof parsed.prompt === "string") ? parsed.prompt : undefined,
        rememberPrevious: parseBoolean(parsed.rememberPrevious, true),
    };
}

export class VariableResolver {
    protected expressionRegex = /\$\{(.*?)\}/gm;
    protected workspaceIndexedRegex = /workspaceFolder\[(\d+)\]/gm;
    protected workspaceNamedRegex = /workspaceFolder:([^}]+)/gm;
    protected configVarRegex = /config:(.+)/m;
    protected envVarRegex = /env:(.+)/m;
    protected inputVarRegex = /input:(.+)/m;
    protected taskIdVarRegex = /taskId:(.+)/m;
    protected commandVarRegex = /command:(.+)/m;
    protected promptVarRegex = /prompt(?::(.*)|)/m;
    protected rememberedValue?: string;
    protected context: vscode.ExtensionContext;
    protected userInputContext: UserInputContext;
    protected input: Input;

    constructor(input: Input, userInputContext: UserInputContext,
                context: vscode.ExtensionContext,
                rememberedValue?: string) {
       this.userInputContext = userInputContext;
       this.rememberedValue = rememberedValue;
       this.input = input;
       this.context = context;
    }

    async resolve(str: string): Promise<string | undefined> {
        // Sort by index (descending)
        // The indices will change once we start substituting the replacements,
        // which are not necessarily the same length
        const matches = [...str.matchAll(this.expressionRegex)]
            .sort((a, b) => b.index - a.index);

        // Process the synchronous string interpolations
        const data = await Promise.all(matches.map(
            (match: RegExpExecArray): string | Thenable<string | undefined> => {
                const value = match[1];

                if (this.workspaceIndexedRegex.test(value)) {
                    return this.bindIndexedFolder(value);
                }
                if (this.workspaceNamedRegex.test(value)) {
                    return this.bindNamedFolder(value);
                }
                if (this.configVarRegex.test(value)) {
                    return this.bindWorkspaceConfigVariable(value);
                }
                if (this.envVarRegex.test(value)) {
                    return this.bindEnvVariable(value);
                }

                const inputVar = this.inputVarRegex.exec(value);
                if (inputVar) {
                    return this.userInputContext
                        .lookupInputValueByInputId(inputVar[1]) ?? '';
                }

                const taskIdVar = this.taskIdVarRegex.exec(value);
                if (taskIdVar) {
                    return this.userInputContext
                        .lookupInputValueByTaskId(taskIdVar[1]) ?? '';
                }

                if (this.commandVarRegex.test(value)) {
                    return this.bindCommandVariable(value);
                }

                const promptVar = this.promptVarRegex.exec(value);
                if (promptVar) {
                    return this.bindPrompt(
                        resolvePromptOptions(promptVar[1]), match);
                }

                return this.bindConfiguration(value);
            },
        ));

        const result = zip(matches, data).reduce((str, [match, replacement]) => {
            return str.slice(0, match.index) + replacement +
                str.slice(match.index + match[0].length);
        }, str);

        return result;
    }

    protected async bindCommandVariable(value: string): Promise<string> {
        const match = this.commandVarRegex.exec(value);
        if (!match) {
            return '';
        }
        const command = match[1];
        const result = await vscode.commands.executeCommand(
            command, { workspaceFolder: this.bindConfiguration("workspaceFolder") });
        return result as string;
    }

    protected async bindPrompt(
        promptOptions: PromptOptions,
        match: RegExpExecArray,
    ): Promise<string> {
        const taskId = this.input.args.taskId ?? this.input.id;
        const promptId = `prompt/${taskId}_${match.index}`;
        const prevValue = this.context.workspaceState.get<string>(promptId, '');
        const initialValue = promptOptions.rememberPrevious ? prevValue : '';

        const result = (await vscode.window.showInputBox({
            value: initialValue,
            prompt: promptOptions.prompt,
        })) ?? '';

        this.context.workspaceState.update(promptId, result);

        return result;
    }

    protected bindIndexedFolder(value: string): string {
        return value.replace(
            this.workspaceIndexedRegex,
            (_: string, index: string): string => {
                const idx = Number.parseInt(index);
                return vscode.workspace.workspaceFolders?.[idx]?.uri.fsPath ?? '';
            },
        );
    }

    protected bindNamedFolder(value: string): string {
        return value.replace(
            this.workspaceNamedRegex,
            (_: string, name: string): string => {
                for (const folder of vscode.workspace.workspaceFolders ?? []) {
                    if (folder.name == name) {
                        return folder.uri.fsPath;
                    }
                }
                return '';
            },
        );
    }

    protected bindConfiguration(value: string): string {
        switch (value) {
            case 'workspaceFolder':
                return vscode.workspace.workspaceFolders?.[this.input.workspaceIndex].uri.fsPath ?? '';
            case 'workspaceFolderBasename':
                return vscode.workspace.workspaceFolders?.[this.input.workspaceIndex].name ?? '';
            case 'fileBasenameNoExtension':
                    return path.parse(vscode.window.activeTextEditor?.document.fileName ?? '').name;
            case 'fileBasename':
                    return path.parse(vscode.window.activeTextEditor?.document.fileName ?? '').base;
            case 'file':
                return vscode.window.activeTextEditor?.document.fileName ?? '';
            case 'lineNumber':
                return vscode.window.activeTextEditor?.selection.active.line.toString() ?? '';
            case 'extension':
                if (vscode.window.activeTextEditor !== null) {
                    const filePath = path.parse(vscode.window.activeTextEditor?.document.fileName ?? '');
                    return filePath.ext;
                }
                return '';
            case 'fileDirName':
                return (vscode.window.activeTextEditor !== null)
                    ? path.dirname(vscode.window.activeTextEditor?.document.uri.fsPath ?? '')
                    : '';
            case 'rememberedValue':
                return this.rememberedValue ?? '';
        }

        return '';
    }

    protected bindWorkspaceConfigVariable(value: string): string {
        const matchResult = this.configVarRegex.exec(value);
        if (!matchResult) {
            return '';
        }
        // Get value from workspace configuration "settings" dictionary
        const workspaceResult = vscode.workspace.getConfiguration().get(matchResult[1], '');
        if (workspaceResult) {
            return workspaceResult;
        }

        const activeFolderResult = vscode.workspace.getConfiguration("", vscode.window.activeTextEditor?.document.uri).get(matchResult[1], '');
        if (activeFolderResult) {
            return activeFolderResult;
        }

        for (const w of vscode.workspace.workspaceFolders ?? []) {
            const currentFolderResult = vscode.workspace.getConfiguration("", w.uri).get(matchResult[1] ?? '', '');
            if (currentFolderResult) {
                return currentFolderResult;
            }
        }
        return "";
    }

    protected bindEnvVariable(value: string): string {
        const result = this.envVarRegex.exec(value);

        if (!result) {
            return '';
        }

        const key = result[1];
        const configuredEnv = this.input.env;

        return configuredEnv[key] ?? process.env[key] ?? '';
    }
}
