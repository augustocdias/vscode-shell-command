export class UserInputContext
{
    protected recordedInputs: { [id: string] : string; } = {};

    reset(): void
    {
        this.recordedInputs = {};
    }

    recordInput(inputId: string, taskValue: string): void
    {
        const i = inputId.lastIndexOf('.');
        this.recordedInputs[i < 0 ? inputId : inputId.substring(0, i)] = taskValue;
    }

    lookupInputValue(inputId: string): string
    {
        const i = inputId.lastIndexOf('.');
        return this.recordedInputs[i < 0 ? inputId : inputId.substring(0, i)];
    }
}
