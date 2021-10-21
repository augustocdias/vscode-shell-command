import * as vscode from 'vscode';
import * as path from 'path';
import { UserInputContext } from './UserInputContext';

export class VariableResolver
{
    protected expressionRegex: RegExp = /\$\{(.*?)\}/gm;
    protected workspaceRegex: RegExp = /workspaceFolder\[(\d+)\]/gm;
    protected configVarRegex: RegExp = /config:(.+)/m;
    protected envVarRegex: RegExp = /env:(.+)/m;
    protected inputVarRegex: RegExp = /input:(.+)/m;
    protected commandVarRegex = /command:(.+)/m;

    async resolve(str: string, userInputContext?: UserInputContext): Promise<string | undefined>
    {
        const promises: Promise<string | undefined>[] = [];

        // Process the synchronous string interpolations
        let result = str.replace(
            this.expressionRegex,
            (_: string, value: string): string => {
                if (this.workspaceRegex.test(value)) {
                    return this.bindIndexedFolder(value);
                }
                if (this.configVarRegex.test(value)) {
                    return this.bindWorkspaceConfigVariable(value)
                }
                if (this.envVarRegex.test(value)) {
                    return this.bindEnvVariable(value)
                }
                if (userInputContext && this.inputVarRegex.test(value)) {
                    return this.bindInputVariable(value, userInputContext);
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
        let match = this.commandVarRegex.exec(value);
        if (!match)
            return '';
        let command = match[1];
        let result = await vscode.commands.executeCommand(command) as string;
        return result;
    }
    
    protected bindIndexedFolder(value: string): string
    {
        return value.replace(
            this.workspaceRegex,
            (_: string, index: string): string => {
                const idx = Number.parseInt(index);
                if (
                    vscode.workspace.workspaceFolders !== undefined &&
                    vscode.workspace.workspaceFolders![idx]
                ) {
                    return vscode.workspace.workspaceFolders![idx]!.uri.fsPath;
                }
                
                return '';
            },
        );
    }

    protected bindConfiguration(value: string): string
    {
        switch (value) {
            case 'workspaceFolder':
                return vscode.workspace.workspaceFolders![0].uri.fsPath;
            case 'workspaceFolderBasename':
                return vscode.workspace.workspaceFolders![0].name;
            case 'file':
                return (vscode.window.activeTextEditor !== null)
                    ? vscode.window.activeTextEditor!.document.fileName
                    : '';
            case 'fileDirName':
                return (vscode.window.activeTextEditor !== null)
                    ? path.dirname(vscode.window.activeTextEditor!.document.uri.fsPath)
                    : '';
        }

        return '';
    }

    protected bindWorkspaceConfigVariable(value: string): string {
        let matchResult = this.configVarRegex.exec(value);
        if (!matchResult) {
            return '';
        }
        // Get value from workspace configuration "settings" dictionary
        let workspaceResult = vscode.workspace.getConfiguration().get(matchResult[1], '');
        if (workspaceResult) {
            return workspaceResult;
        }

        let activeFolderResult = vscode.workspace.getConfiguration("", vscode.window.activeTextEditor?.document.uri).get(matchResult[1], '');
        if (activeFolderResult) {
            return activeFolderResult;
        }

        for (const w of vscode.workspace.workspaceFolders!) {
            let currentFolderResult = vscode.workspace.getConfiguration("", w.uri).get(matchResult![1], '');
            if (currentFolderResult) {
                return currentFolderResult;
            }
        }
        return "";
    }

    protected bindEnvVariable(value: string): string {
        let result = this.envVarRegex.exec(value);
        if (!result) {
            return '';
        }

        return process.env[result[1]] || '';
    }

    protected bindInputVariable(value: string, userInputContext: UserInputContext): string {
        let result = this.inputVarRegex.exec(value);
        if (!result) {
            return '';
        }

        return userInputContext.lookupInputValue(result[1]) || '';
    }
}
