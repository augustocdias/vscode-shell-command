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
        canPickMany: false
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
            useSingleResult: args.useSingleResult
        };
    }

    handle()
    {
        const result = this.runCommand();
        const nonEmptyInput = this.parseResult(result);
        const useFirstResult = (this.args.useFirstResult
            || (this.args.useSingleResult && nonEmptyInput.length === 1));

        return (useFirstResult
            ? nonEmptyInput[0]
            : this.quickPick(nonEmptyInput));
    }

    protected runCommand()
    {
        const options: subprocess.ExecSyncOptionsWithStringEncoding = {
            encoding: 'utf8',
            cwd: this.args.cwd,
            env: this.args.env,
//            shell: vscode.env.shell
        };
        
        return subprocess.execSync(this.args.command!, options);
    }

    protected parseResult(result: string)
    {
        return result
            .split(this.EOL)
            .filter((value: string) => value && value.trim().length > 0);
    }

    protected quickPick(input: string[])
    {
        return vscode.window.showQuickPick(input, this.inputOptions);
    }
}