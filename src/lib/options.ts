import * as vscode from "vscode";

export function parseBoolean(value: unknown, defaultValue: boolean): boolean {
    if (value === undefined) {
        return defaultValue;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') {
            return true;
        } else if (value.toLowerCase() === 'false') {
            return false;
        }
    }
    vscode.window.showWarningMessage(`Cannot parse the boolean value: ${value}, use the default: ${defaultValue}`);
    return defaultValue;
}
