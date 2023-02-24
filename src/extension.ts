import * as vscode from 'vscode';
import { ShellCommandOptions } from './lib/ShellCommandOptions';
import { CommandHandler } from './lib/CommandHandler';
import { UserInputContext } from './lib/UserInputContext';
import { ShellCommandException } from './util/exceptions';

export function activate(this: any, context: vscode.ExtensionContext) {
    const command = 'shellCommand.execute';
    const userInputContext = new UserInputContext();
    const callback = (args: ShellCommandOptions) => {
        try {
            const handler = new CommandHandler(args, userInputContext, context);
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

    // Triggers a reset of the userInput context
    context.subscriptions.push(vscode.tasks.onDidStartTask(() => userInputContext.reset()));
    context.subscriptions.push(vscode.debug.onDidStartDebugSession(() => userInputContext.reset()));

}
