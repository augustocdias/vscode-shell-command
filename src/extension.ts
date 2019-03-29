import * as vscode from 'vscode';
import * as process from 'child_process';
import * as os from 'os';

export function activate(context: vscode.ExtensionContext) {

    const command = 'shellCommand.execute';

    const commandHandler = (args: ShellCommandOptions) => {
        if(!args.hasOwnProperty('command')) {
            vscode.window.showErrorMessage('Please specify the "command" property.');
        } else {
            const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath;
            const cwd = args.cwd || workspaceFolder;
            const options: process.ExecSyncOptionsWithStringEncoding = {
                encoding: 'utf8',
                cwd: cwd,
                env: args.env
            };
            try {
                const result = process.execSync(args.command, options);
                const inputOptions: vscode.QuickPickOptions = {
                    canPickMany: false,
                };
                const nonEmptyInput = result.split(os.EOL).filter((value: string) => value && value.trim().length > 0);
                return vscode.window.showQuickPick(nonEmptyInput, inputOptions);
            } catch (error) {
                console.error(error);
                vscode.window.showErrorMessage('Error executing shell command ' + error);
            }
        }
    };

    context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
}

interface ShellCommandOptions {
    cwd: string | undefined;
    command: string;
    env: { [s: string]: string; } | undefined;
}

// this method is called when your extension is deactivated
export function deactivate() {}
