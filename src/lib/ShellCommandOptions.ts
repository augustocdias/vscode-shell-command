export interface ShellCommandOptions
{
    cwd: string | undefined;
    command: string;
    env: { [s: string]: string } | undefined;
    useFirstResult?: boolean;
    useSingleResult?: boolean;
    rememberPrevious?: boolean;
    fieldSeparator?: string;
    description?: string;
    maxBuffer?: number;
    taskId?: string;
    defaultOptions?: [string];
}
