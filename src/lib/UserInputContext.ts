import * as vscode from "vscode";

export class UserInputContext
{
    protected context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    recordInputByInputId(inputId: string | undefined, taskValue: string | undefined): void {
        if (inputId !== undefined) {
            this.context.workspaceState.update(
                `UserInputContext/inputId/${inputId}`, taskValue);
        }
    }

    recordInputByTaskId(taskId: string | undefined, taskValue: string | undefined): void {
        if (taskId !== undefined) {
            this.context.workspaceState.update(
                `UserInputContext/taskId/${taskId}`, taskValue);
        }
    }

    lookupInputValueByInputId(inputId: string): string | undefined {
        return this.context.workspaceState.get(
            `UserInputContext/inputId/${inputId}`);
    }

    lookupInputValueByTaskId(taskId: string): string | undefined {
        return this.context.workspaceState.get(
            `UserInputContext/taskId/${taskId}`);
    }
}
