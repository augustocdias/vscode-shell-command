import * as vscode from 'vscode';
import * as path from 'path';

export class VariableResolver
{
    protected expressionRegex: RegExp = /\$\{(.*?)\}/gm;
    protected workspaceRegex: RegExp = /workspaceFolder\[(\d+)\]/gm;

    resolve(str: string): string | undefined
    {
        const result = str.replace(
            this.expressionRegex,
            (_: string, value: string): string => {
                if (this.workspaceRegex.test(value)) {
                    return this.bindIndexedFolder(value);
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
}