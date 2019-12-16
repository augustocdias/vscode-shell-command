import * as vscode from 'vscode';
import { ShellCommandOptions } from './lib/ShellCommandOptions';
import { CommandHandler } from './lib/CommandHandler';
import { ShellCommandException } from './util/exceptions';

export function activate(context: vscode.ExtensionContext) {
    const command = 'shellCommand.execute';
    const callback = (args: ShellCommandOptions) => {
        try {
            const handler = new CommandHandler(args);
            return handler.handle();
        } catch (error) {
            const message = (error instanceof ShellCommandException)
                ? error.message
                : 'Error executing shell command: ' + error;

            console.error(error);
            vscode.window.showErrorMessage(message);
        }
    };

    const disposable = vscode.commands.registerCommand(command, callback);
    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}