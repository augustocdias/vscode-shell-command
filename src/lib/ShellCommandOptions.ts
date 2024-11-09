export interface ShellCommandOptions
{
    cwd?: string;
    command: unknown;
    commandArgs?: unknown;
    env?: { [s: string]: string };
    useFirstResult?: boolean;
    useSingleResult?: boolean;
    rememberPrevious?: boolean;
    allowCustomValues?: boolean;
    multiselect?: boolean;
    warnOnStderr?: boolean;
    multiselectSeparator?: string;
    fieldSeparator?: string;
    description?: string;
    maxBuffer?: number;
    taskId?: string;
    defaultOptions?: [string];
    stdio?: "stdout" | "stderr" | "both";
}
