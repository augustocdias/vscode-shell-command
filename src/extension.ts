import * as vscode from 'vscode';
import * as subprocess from 'child_process';
import { CommandHandler } from './lib/CommandHandler';
import { UserInputContext } from './lib/UserInputContext';
import { ShellCommandException } from './util/exceptions';

// This is the type use by the vscode API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function activate(this: any, context: vscode.ExtensionContext) {
    const command = 'shellCommand.execute';
    const userInputContext = new UserInputContext();
    const callback = (args: { [key: string]: unknown }) => {
        try {
            const handler = new CommandHandler(args, userInputContext, context, subprocess);
            return handler.handle();
        } catch (error) {
            const message = (error instanceof ShellCommandException)
                ? error.message
                : 'Error executing shell command: ' + error;

            console.error(error);
            vscode.window.showErrorMessage(message);
        }
    };

    context.subscriptions.push(vscode.commands.registerCommand(command, callback, this));
}
