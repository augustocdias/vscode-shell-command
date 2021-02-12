import * as vscode from 'vscode';
import * as path from 'path';

export class VariableResolver
{
    protected expressionRegex: RegExp = /\$\{(.*?)\}/gm;
    protected workspaceRegex: RegExp = /workspaceFolder\[(\d+)\]/gm;
    protected configVarRegex: RegExp = /config:(.+)/m;
    protected envVarRegex: RegExp = /env:(.+)/m;

    resolve(str: string): string | undefined
    {
        const result = str.replace(
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

                return this.bindConfiguration(value);
            },
        );
        
        return result === '' ? undefined : result;
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
        let result = this.configVarRegex.exec(value);
        if (!result)
        {
            return '';
        }

        // Get value from workspace configuration "settings" dictionary
        return vscode.workspace.getConfiguration().get(result[1], '');
    }

    protected bindEnvVariable(value: string): string {
        let result = this.envVarRegex.exec(value);
        if (!result) {
            return '';
        }

        return process.env[result[1]] || '';
    }
}
