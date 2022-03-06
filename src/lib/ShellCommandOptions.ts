export interface ShellCommandOptions
{
    id?: string;
    cwd: string | undefined;
    command: string;
    env: { [s: string]: string } | undefined;
    useFirstResult?: boolean;
    useSingleResult?: boolean;
    fieldSeparator?: string;
    description?: string;
    maxBuffer?: number;
    defaultOptions?: [string];
}
