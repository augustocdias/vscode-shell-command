export class ShellCommandException extends Error { }

export class VariableResolveException extends Error {
    constructor(variable: string, message: string) {
        super(`Error resolving variable '\${${variable}}': ${message}`);
    }
}
