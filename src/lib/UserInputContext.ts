export class UserInputContext
{
    protected recordedInputsByInputId: { [id: string] : string | undefined; } = {};
    protected recordedInputsByTaskId: { [id: string] : string | undefined; } = {};

    recordInputByInputId(inputId: string | undefined, taskValue: string | undefined): void {
        if (inputId !== undefined) {
            this.recordedInputsByInputId[inputId] = taskValue;
        }
    }

    recordInputByTaskId(taskId: string | undefined, taskValue: string | undefined): void {
        if (taskId !== undefined) {
            this.recordedInputsByTaskId[taskId] = taskValue;
        }
    }

    lookupInputValueByInputId(inputId: string): string | undefined {
        return this.recordedInputsByInputId[inputId];
    }

    lookupInputValueByTaskId(taskId: string): string | undefined {
        return this.recordedInputsByTaskId[taskId];
    }
}
