import * as vscode from 'vscode';
import * as subprocess from 'child_process';
import { CommandHandler } from './lib/CommandHandler';
import { UserInputContext } from './lib/UserInputContext';
import { ShellCommandException } from './util/exceptions';

// This is the type use by the vscode API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function activate(this: any, context: vscode.ExtensionContext) {
    const userInputContext = new UserInputContext(context);

    const handleExecute = async (args: { [key: string]: unknown }) => {
        try {
            const handler = new CommandHandler(args, userInputContext, context, subprocess);
            const result = await handler.handle();
            return result;
        } catch (error) {
            const message = (error instanceof ShellCommandException)
                ? error.message
                : 'Error executing shell command: ' + error;

            console.error(error);
            throw message;
        }
    };

    context.subscriptions.push(vscode.commands.registerCommand(
        'shellCommand.execute',
        handleExecute,
        this,
    ));

    // Reimplementation of promptString that can be used from inputs.
    const handlePromptString = async () => {
        vscode.window.showWarningMessage(
            'shellCommand.promptString is deprecated. Please use `${prompt}`.');
        const ignoreFocusOut = vscode.workspace.getConfiguration('shellCommand').get<boolean>('ignoreFocusOut');
        const inputValue = await vscode.window.showInputBox({ ignoreFocusOut });

        return inputValue || '';
    };

    context.subscriptions.push(vscode.commands.registerCommand(
        'shellCommand.promptString',
        handlePromptString,
        this,
    ));
}
