import * as vscode from 'vscode';
import * as process from 'child_process';
import * as path from 'path';
import { ShellCommandOptions } from "./lib/ShellCommandOptions";

export function activate(context: vscode.ExtensionContext) {
    const command = 'shellCommand.execute';
    const endOfLineRegex = /\r\n|\r|\n/;

    const commandHandler = (args: ShellCommandOptions) => {
        if (!args.hasOwnProperty('command')) {
            vscode.window.showErrorMessage('Please specify the "command" property.');
        } else {
            const cwd = args.cwd ? resolveVariables(args.cwd!) : undefined;
            if (args.env !== undefined) {
                Object.keys(args.env!).forEach((element) => {
                    args.env![element] = resolveVariables(args.env![element]) || '';
                });
            }
            const options: process.ExecSyncOptionsWithStringEncoding = {
                encoding: 'utf8',
                cwd: cwd,
                env: args.env,
            };
            try {
                const { useFirstResult } = args;
                const cmd = resolveVariables(args.command);
                if (cmd === undefined) {
                    vscode.window.showErrorMessage(
                        'Your command is bad formatted and variables could not be resolved',
                    );
                    return;
                }
                const result = process.execSync(cmd!, options);
                const inputOptions: vscode.QuickPickOptions = {
                    canPickMany: false,
                };
                const nonEmptyInput = result
                    .split(endOfLineRegex)
                    .filter((value: string) => value && value.trim().length > 0);

                if (useFirstResult) {
                    return nonEmptyInput[0];
                }

                return vscode.window.showQuickPick(nonEmptyInput, inputOptions);
            } catch (error) {
                console.error(error);
                vscode.window.showErrorMessage('Error executing shell command ' + error);
            }
        }
    };

    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
}

function resolveVariables(str: string): string | undefined {
    const expressionRegex = /\$\{(.*?)\}/gm;
    const result = str.replace(
        expressionRegex,
        (match: string, value: string): string => {
            const workspaceRegex = /workspaceFolder\[(\d+)\]/gm;
            if (workspaceRegex.test(value)) {
                return value.replace(
                    workspaceRegex,
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

            switch (value) {
                case 'workspaceFolder':
                    return vscode.workspace.workspaceFolders![0].uri.fsPath;
                case 'workspaceFolderBasename':
                    return vscode.workspace.workspaceFolders![0].name;
                case 'file':
                    if (vscode.window.activeTextEditor === null) {
                        return '';
                    }
                    return vscode.window.activeTextEditor!.document.fileName;
                case 'fileDirName':
                    if (vscode.window.activeTextEditor === null) {
                        return '';
                    }
                    return path.dirname(vscode.window.activeTextEditor!.document.uri.fsPath);
            }
            
            return '';
        },
    );
    return result === '' ? undefined : result;
}

// this method is called when your extension is deactivated
export function deactivate() {}
