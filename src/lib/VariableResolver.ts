import * as vscode from 'vscode';
import * as path from 'path';
import { UserInputContext } from './UserInputContext';

export type Input = {
    command: "shellCommand.execute";
    args: {
        taskId: string;
        command: string | string[];
        cwd: string;
        env: Record<string, string>;
    },
    id: string;
    type: string;
    workspaceIndex: number;
    env: Record<string, string>;
}

export class VariableResolver {
    protected expressionRegex = /\$\{(.*?)\}/gm;
    protected workspaceIndexedRegex = /workspaceFolder\[(\d+)\]/gm;
    protected workspaceNamedRegex = /workspaceFolder:([^}]+)/gm;
    protected configVarRegex = /config:(.+)/m;
    protected envVarRegex = /env:(.+)/m;
    protected inputVarRegex = /input:(.+)/m;
    protected commandVarRegex = /command:(.+)/m;
    protected rememberedValue?: string;
    protected userInputContext?: UserInputContext;
    protected input: Input;

    constructor(input: Input, userInputContext?: UserInputContext,
                rememberedValue?: string) {
       this.userInputContext = userInputContext;
       this.rememberedValue = rememberedValue;
       this.input = input;
    }

    async resolve(str: string): Promise<string | undefined> {
        const promises: Promise<string | undefined>[] = [];

        // Process the synchronous string interpolations
        let result = str.replace(
            this.expressionRegex,
            (_: string, value: string): string => {
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
                if (this.userInputContext && this.inputVarRegex.test(value)) {
                    return this.bindInputVariable(value, this.userInputContext);
                }
                if (this.commandVarRegex.test(value)) {
                    // We don't replace these yet, they have to be done asynchronously
                    promises.push(this.bindCommandVariable(value));
                    return _;
                }
                return this.bindConfiguration(value);
            },
        );

        // Process the async string interpolations
        const data = await Promise.all(promises) as string[];
        result = result.replace(this.expressionRegex, () => data.shift() ?? '');
        return result === '' ? undefined : result;
    }

    protected async bindCommandVariable(value: string): Promise<string> {
        const match = this.commandVarRegex.exec(value);
        if (!match) {
            return '';
        }
        const command = match[1];
        const result = await vscode.commands.executeCommand(command);
        return result as string;
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

    protected bindInputVariable(value: string, userInputContext: UserInputContext): string {
        const result = this.inputVarRegex.exec(value);
        if (!result) {
            return '';
        }

        return userInputContext.lookupInputValue(result[1]) || '';
    }
}
