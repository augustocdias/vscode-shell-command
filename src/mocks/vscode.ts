import * as vscode from "vscode";

// This is a mock of vscode, which uses namespaces.
/* eslint-disable @typescript-eslint/no-namespace */

// Usage as a spy:
// 1. Replace `import * as vscode from "vscode"` with
// `import * as vscode from "../mocks/vscode"` in the productive code
// 2. Call `vscode.Spy.write()` somewhere
// 3. Run the extension with debugging
// 4. Copy the printed mock data

// Whether to behave like a spy (listen to the return values from real vscode module)
// or a mock (return back saved data).
let mode: "mock" | "spy" = "spy";

export namespace Spy {
    type FuncName = string;
    type Args = string;
    export type SpyCalls = Record<FuncName, Record<Args, unknown>>;

    let spyCalls: SpyCalls = {};

    export function write() {
        console.log(JSON.stringify({
            staticData: {
                "workspace.workspaceFolders": vscode.workspace.workspaceFolders || [],
                "window.activeTextEditor.document.fileName": vscode.window.activeTextEditor?.document?.fileName,
                "window.activeTextEditor.document.uri.fsPath": vscode.window.activeTextEditor?.document?.uri?.fsPath,
                "window.activeTextEditor.selection.active.line": vscode.window.activeTextEditor?.selection?.active?.line,
            },
            calls: spyCalls,
        } satisfies MockData));
    }

    export function load(calls: SpyCalls) {
        spyCalls = calls;
    }

    export function saveCall(funcName: string, args: unknown[], result: unknown) {
        const argsString = JSON.stringify(args);
        if (!(funcName in spyCalls)) {
            spyCalls[funcName] = {};
        }
        if (!(argsString in spyCalls[funcName])) {
            spyCalls[funcName][argsString] = {};
        }
        spyCalls[funcName][argsString] = result;
    }

    export function getCall(funcName: string, args: unknown[]) {
        return spyCalls?.[funcName]?.[JSON.stringify(args)];
    }
}

type MockData = {
    calls: Spy.SpyCalls;
    staticData: {
        "workspace.workspaceFolders": readonly vscode.WorkspaceFolder[];
        "window.activeTextEditor.document.fileName": string | undefined;
        "window.activeTextEditor.document.uri.fsPath": string | undefined;
        "window.activeTextEditor.selection.active.line": number | undefined;
    };
}

// This mock does not need to be saved
const showWarningMessageCalls: string[] = [];

export namespace window {
    export namespace activeTextEditor {
        export namespace document {
            // Here and below: these ARE redefined by setMockData
            // eslint-disable-next-line prefer-const
            export let fileName: string | undefined = undefined;
            export namespace uri {
                // eslint-disable-next-line prefer-const
                export let fsPath: string | undefined = undefined;
            }
        }
        export namespace selection {
            export namespace active {
                // eslint-disable-next-line prefer-const
                export let line: number | undefined = undefined;
            }
        }
    }

    export function showWarningMessage(message: string) {
        showWarningMessageCalls.push(message);
    }

    export function getShowWarningMessageCalls() {
        return showWarningMessageCalls;
    }

    export function resetShowWarningMessageCalls() {
        showWarningMessageCalls.length = 0;
    }
}

export namespace workspace {

    export const workspaceFolders = [];

    export function getConfiguration(
        section?: string, resource?: vscode.Uri | null) {
        const funcName = "workspace.getConfiguration().inspect()";
        const path = (resource as {path?: string})?.path;

        if (mode == "mock") {
            return {
                inspect(key: string) {
                    return Spy.getCall(funcName, [section, path, key]);
                }
            };
        } else {
            const result = vscode.workspace.getConfiguration(section, resource);

            const originalInspect = result.inspect;

            return {
                ...result,
                inspect: function<T>(key: string) {
                    const inspectResult = originalInspect<T>(key);
                    Spy.saveCall(funcName, [section, path, key], inspectResult);
                    return inspectResult;
                }
            };
        }
    }
}

// Set the workspace folder data without creating a new array. The
// namespaced variable needs to keep its reference to the array.
function updateArray<T>(dest: T[], src: readonly T[]) {
    dest.length = 0;
    dest.push(...src);
}

export function setMockData(data: MockData) {
    mode = "mock";
    Spy.load(data.calls);
    const staticData = data.staticData;
    updateArray(workspace.workspaceFolders, staticData["workspace.workspaceFolders"]);
    window.activeTextEditor.document.fileName = staticData["window.activeTextEditor.document.fileName"];
    window.activeTextEditor.document.uri.fsPath = staticData["window.activeTextEditor.document.uri.fsPath"];
    window.activeTextEditor.selection.active.line = staticData["window.activeTextEditor.selection.active.line"];
}
