import * as vscode from 'vscode';
import * as subprocess from 'child_process';
import { ShellCommandOptions } from './ShellCommandOptions';
import { VariableResolver } from './VariableResolver';
import { ShellCommandException } from '../util/exceptions';

export class CommandHandler
{
    protected args: ShellCommandOptions;
    protected EOL: RegExp = /\r\n|\r|\n/;
    protected inputOptions: vscode.QuickPickOptions = {
        canPickMany: false,
        matchOnDescription: true,
        matchOnDetail: true
    };

    constructor(args: ShellCommandOptions)
    {
        if (!args.hasOwnProperty('command')) {
            throw new ShellCommandException('Please specify the "command" property.');
        }

        const resolver = new VariableResolver();
        const resolve = (arg: string) => resolver.resolve(arg);

        const command = resolve(args.command);
        if (command === undefined) {
            throw new ShellCommandException('Your command is badly formatted and variables could not be resolved');
        }

        const env = args.env;
        if (env !== undefined) {
            for (const key in env!) {
                if (env!.hasOwnProperty(key)) {
                    env![key] = resolve(env![key]) || '';
                }
            }
        }

        const cwd = (args.cwd) ? resolve(args.cwd!) : vscode.workspace.workspaceFolders![0].uri.fsPath;

        this.args = {
            command: command,
            cwd: cwd,
            env: env,
            useFirstResult: args.useFirstResult,
            useSingleResult: args.useSingleResult,
            fieldSeparator: args.fieldSeparator,
            maxBuffer: args.maxBuffer
        };

        if (args.description !== undefined) {
            this.inputOptions.placeHolder = args.description;
        }
    }

    handle()
    {
        const result = this.runCommand();
        const nonEmptyInput = this.parseResult(result);
        const useFirstResult = (this.args.useFirstResult
            || (this.args.useSingleResult && nonEmptyInput.length === 1));

        return (useFirstResult
            ? nonEmptyInput[0].value
            : this.quickPick(nonEmptyInput));
    }

    protected runCommand()
    {
        const options: subprocess.ExecSyncOptionsWithStringEncoding = {
            encoding: 'utf8',
            cwd: this.args.cwd,
            env: this.args.env,
            maxBuffer: this.args.maxBuffer,
//            shell: vscode.env.shell
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

    protected quickPick(input: any[])
    {
        return vscode.window.showQuickPick(input, this.inputOptions).then((selection) => selection?.value);
    }
}