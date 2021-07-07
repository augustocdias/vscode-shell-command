import * as vscode from 'vscode';
import * as path from 'path';

export class UserInputContext
{
    protected recordedInputs: { [id: string] : string; } = {};

    reset(): void
    {
        this.recordedInputs = {};
    }

    recordInput(inputId: string, taskValue: string): void
    {
        this.recordedInputs[inputId] = taskValue;
    }

    lookupInputValue(inputId: string): string
    {
        return this.recordedInputs[inputId];
    }
}
