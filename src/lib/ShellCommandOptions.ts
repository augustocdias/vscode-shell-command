export interface ShellCommandOptions
{
    cwd?: string;
    command: unknown;
    commandArgs?: unknown;
    env?: { [s: string]: string };
    useFirstResult?: boolean;
    useSingleResult?: boolean;
    rememberPrevious?: boolean;
    fieldSeparator?: string;
    description?: string;
    maxBuffer?: number;
    taskId?: string;
    defaultOptions?: [string];
}
