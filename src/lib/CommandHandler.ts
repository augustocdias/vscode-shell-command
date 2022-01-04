import * as vscode from 'vscode';
import * as subprocess from 'child_process';
import { ShellCommandOptions } from './ShellCommandOptions';
import { VariableResolver } from './VariableResolver';
import { ShellCommandException } from '../util/exceptions';
import { UserInputContext } from './UserInputContext';

export class CommandHandler
{
    protected args: ShellCommandOptions;
    protected EOL: RegExp = /\r\n|\r|\n/;
    protected inputOptions: vscode.QuickPickOptions = {
        canPickMany: false,
        matchOnDescription: true,
        matchOnDetail: true
    };
    protected userInputContext: UserInputContext;
    protected inputId?: string;

    constructor(args: ShellCommandOptions, userInputContext: UserInputContext)
    {
        if (!args.hasOwnProperty('command')) {
            throw new ShellCommandException('Please specify the "command" property.');
        }
        this.inputId = this.resolveCommandToInputId(args.command);
        this.userInputContext = userInputContext;

        this.args = {
            command: args.command,
            cwd: args.cwd,
            env: args.env,
            useFirstResult: args.useFirstResult,
            useSingleResult: args.useSingleResult,
            fieldSeparator: args.fieldSeparator,
            maxBuffer: args.maxBuffer
        };

        if (args.description !== undefined) {
            this.inputOptions.placeHolder = args.description;
        }
    }

    protected async resolveArgs()
    {
        const resolver = new VariableResolver();

        const command = await resolver.resolve(this.args.command, this.userInputContext);
        if (command === undefined) {
            throw new ShellCommandException('Your command is badly formatted and variables could not be resolved');
        }
        else {
            this.args.command = command;
        }

        if (this.args.env !== undefined) {
            for (const key in this.args.env!) {
                if (this.args.env!.hasOwnProperty(key)) {
                    this.args.env![key] = await resolver.resolve(this.args.env![key], this.userInputContext) || '';
                }
            }
        }

        this.args.cwd = this.args.cwd ? await resolver.resolve(this.args.cwd!, this.userInputContext) : vscode.workspace.workspaceFolders![0].uri.fsPath;
    }

    async handle()
    {
       await this.resolveArgs();

        const result = this.runCommand();
        const nonEmptyInput = this.parseResult(result);
        const useFirstResult = (this.args.useFirstResult
            || (this.args.useSingleResult && nonEmptyInput.length === 1));
        if (useFirstResult) {
            if (this.inputId && this.userInputContext) {
                this.userInputContext.recordInput(this.inputId, nonEmptyInput[0].value);
            }
            return nonEmptyInput[0].value;
        } else {
            return this.quickPick(nonEmptyInput);
        }
    }

    protected runCommand()
    {
        const options: subprocess.ExecSyncOptionsWithStringEncoding = {
            encoding: 'utf8',
            cwd: this.args.cwd,
            env: this.args.env,
            maxBuffer: this.args.maxBuffer,
        //    shell: vscode.env.shell
        };
        return subprocess.execSync(this.args.command!, options);
    }

    protected parseResult(result: string)
    {
        return result
            .split(this.EOL)
            .map((value: string) => {
                const values = value.trim().split(this.args.fieldSeparator!, 4);
                return {
                    value: values[0],
                    label: values[1] ?? value,
                    description: values[2],
                    detail: values[3]
                };
            })
            .filter((item: any) => item.label && item.label.trim().length > 0);
    }

    protected async quickPick(input: any[])
    {
        return vscode.window.showQuickPick(input, this.inputOptions).then((selection) => {
            let didCancelQuickPickSession = !selection;
            if (didCancelQuickPickSession) {
                this.userInputContext.reset();
            }
            else if (this.inputId) {
                this.userInputContext.recordInput(this.inputId, selection.value);
            }
            return selection?.value;
        })
    }

    protected resolveCommandToInputId(cmd: string | undefined)
    {
        // Lookup the inputId from the supplied command input string
        if (!cmd)
            return undefined;

        const launchInputs = vscode.workspace.getConfiguration().get('launch.inputs') || [];
        const taskInputs = vscode.workspace.getConfiguration().get('tasks.inputs') || [];

        let inputs: any[] = [];
        if (Array.isArray(launchInputs))
            inputs = inputs.concat(launchInputs);
        if (Array.isArray(taskInputs))
            inputs = inputs.concat(taskInputs);
        return inputs.filter(input => input && input.args && input.args.command && input.args.command == cmd)[0]?.id;
 }
}
