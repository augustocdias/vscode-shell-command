export interface ShellCommandOptions
{
    cwd?: string;
    command: unknown;
    commandArgs?: unknown;
    stdin?: string;
    stdinResolveVars?: boolean;
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
    rememberAs?: string;
    defaultOptions?: [string];
    stdio?: "stdout" | "stderr" | "both";
}
