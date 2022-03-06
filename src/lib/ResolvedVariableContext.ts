export class ResolvedVariableContext extends Map<string, string> implements PromiseLike<void> {
    pendings: Map<string, Thenable<void>> = new Map;

    get(key: string): string | undefined;
    get(key: string, defaultValue: string): string;
    get(key: string, defaultValue: () => Thenable<string>): string | undefined;
    get(key: string, defaultValue?: string | (() => Thenable<string>)): string | undefined {
        const isAsync = typeof defaultValue === 'function';
        if (!this.has(key, isAsync) && defaultValue !== undefined) {
            this.set(key, isAsync ? defaultValue() : defaultValue);
        }
        return super.get(key);
    }

    set(key: string, value: string | Thenable<string>): this {
        if (typeof value === 'string') {
            return super.set(key, value)
        }
        return this.pendings.set(key, value.then(value => {
            super.set(key, value);
            this.pendings.delete(key);
        }, reason => {
            this.pendings.delete(key);
            throw reason;
        })), this;
    }

    has(key: string, includePending = false): boolean {
        return super.has(key) || includePending && this.hasPending(key);
    }

    hasPending(key: string): boolean {
        return this.pendings.has(key);
    }

    then<T1 = void, T2 = never>(
        onfulfilled?: (() => T1 | PromiseLike<T1>) | null,
        onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null
    ): PromiseLike<T1 | T2> {
        return Promise.all(this.pendings.values()).then(onfulfilled, onrejected);
    }
}
