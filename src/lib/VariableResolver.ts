import * as vscode from 'vscode';
import * as path from 'path';

export class VariableResolver {
    protected expressionRegex = /(\$+)\{(.*?)\}/gm;
    protected workspaceRegex = /workspaceFolder\[(\d+)\]/gm;
    protected configVarRegex = /config:(.+)/m;
    protected envVarRegex = /env:(.+)/m;
    protected inputVarRegex = /input:(.+)/m;
    protected commandVarRegex = /command:(.+)/m;

    async resolve(str: string, resolvedVariables: Map<string, string>): Promise<string | undefined> {
        const promises: Map<string, Promise<string>> = new Map;
        const commands: [string, number][] = [];
        let diff = 0;

        // Process the synchronous string interpolations
        let result = str.replace(
            this.expressionRegex,
            (match: string, dollars: string, variable: string, offset: number): string => {
                // Every '$$' before '{' will be interpreted as one literal dollar
                let value = '$'.repeat(dollars.length / 2);
                if (dollars.length % 2 === 0) {
                    value += `{${variable}}`;
                } else if (this.workspaceRegex.test(variable)) {
                    value += this.bindIndexedFolder(variable);
                } else if (this.configVarRegex.test(variable)) {
                    value += this.bindWorkspaceConfigVariable(variable)
                } else if (this.envVarRegex.test(variable)) {
                    value += this.bindEnvVariable(variable)
                } else if (resolvedVariables && this.inputVarRegex.test(variable)) {
                    value += this.bindInputVariable(variable, resolvedVariables);
                } else if (this.commandVarRegex.test(variable)) {
                    // We don't replace these yet, they have to be done asynchronously
                    promises.has(variable) || promises.set(variable, this.bindCommandVariable(variable, resolvedVariables));
                    commands.unshift([variable, offset + diff + value.length]);
                } else {
                    value += this.bindConfiguration(variable);
                }
                diff += value.length - match.length;
                return value;
            },
        );

        // Process the async string interpolations
        for (const [command, offset] of commands) {
            result = result.slice(0, offset) + await promises.get(command) + result.slice(offset);
        }
        return result === '' ? undefined : result;
    }

    protected async bindCommandVariable(value: string, resolvedVariables: Map<string, string>): Promise<string> {
        const match = this.commandVarRegex.exec(value);
        if (!match)
            return '';
        const command = match[1];
        let result = resolvedVariables.get(`command:${command}`);
        if (result) {
            return result;
        }
        result = await vscode.commands.executeCommand(command) as string;
        resolvedVariables.set(`command:${command}`, result);
        return result;
    }

    protected bindIndexedFolder(value: string): string {
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

    protected bindConfiguration(value: string): string {
        switch (value) {
            case 'workspaceFolder':
                return vscode.workspace.workspaceFolders![0].uri.fsPath;
            case 'workspaceFolderBasename':
                return vscode.workspace.workspaceFolders![0].name;
            case 'fileBasenameNoExtension':
                if (vscode.window.activeTextEditor !== null) {
                    const filePath = path.parse(vscode.window.activeTextEditor!.document.fileName);
                    return filePath.name;
                }
                return '';
            case 'fileBasename':
                if (vscode.window.activeTextEditor !== null) {
                    const filePath = path.parse(vscode.window.activeTextEditor!.document.fileName);
                    return filePath.base;
                }
                return '';
            case 'file':
                return (vscode.window.activeTextEditor !== null)
                    ? vscode.window.activeTextEditor!.document.fileName
                    : '';
            case 'extension':
                if (vscode.window.activeTextEditor !== null) {
                    const filePath = path.parse(vscode.window.activeTextEditor!.document.fileName);
                    return filePath.ext;
                }
                return '';
            case 'fileDirName':
                return (vscode.window.activeTextEditor !== null)
                    ? path.dirname(vscode.window.activeTextEditor!.document.uri.fsPath)
                    : '';
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

        for (const w of vscode.workspace.workspaceFolders!) {
            const currentFolderResult = vscode.workspace.getConfiguration("", w.uri).get(matchResult![1], '');
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

        return process.env[result[1]] || '';
    }

    protected bindInputVariable(value: string, resolvedVariables: Map<string, string>): string {
        const result = this.inputVarRegex.exec(value);
        if (!result) {
            return '';
        }

        return resolvedVariables.get(`input:${result[1]}`) ?? '';
    }
}
