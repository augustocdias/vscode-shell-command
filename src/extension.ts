import * as vscode from 'vscode';
import { ShellCommandOptions } from './lib/ShellCommandOptions';
import { CommandHandler } from './lib/CommandHandler';
import { ShellCommandException } from './util/exceptions';
import { ResolvedVariableContext } from './lib/ResolvedVariableContext';

export function activate(this: any, context: vscode.ExtensionContext) {
    const command = 'shellCommand.execute';
    const resolvedVariables = new ResolvedVariableContext;
    const callback = (args: ShellCommandOptions) => {
        try {
            const handler = new CommandHandler(args, resolvedVariables);
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
    context.subscriptions.push(vscode.tasks.onDidStartTask(resolvedVariables.clear));
    context.subscriptions.push(vscode.debug.onDidStartDebugSession(resolvedVariables.clear));

}

// this method is called when your extension is deactivated
export function deactivate() {}