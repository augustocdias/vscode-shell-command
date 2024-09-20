import * as child_process from "child_process";
import * as path from "path";

import * as vscode from "vscode";
import { describe, expect, test, vi, beforeEach } from 'vitest';

import { ShellCommandOptions } from "./ShellCommandOptions";
import { CommandHandler } from './CommandHandler';
import { UserInputContext } from './UserInputContext';
import * as mockVscode from '../mocks/vscode';

const mockExtensionContext = {
    workspace: {
        workspaceFolders: {
        },
    }
};

vi.mock("child_process", async (importOriginal) => ({
    ...await importOriginal<typeof import("child_process")>(),
}));
const execSyncSpy = vi.spyOn(child_process, 'execSync');
const execFileSyncSpy = vi.spyOn(child_process, 'execFileSync');

beforeEach(() => {
    execSyncSpy.mockClear();
    execFileSyncSpy.mockClear();
});

describe("Simple cases", async () => {
    const testDataPath = path.join(__dirname, "../test/testData/simple");
    const filePath = `${testDataPath}/.vscode/tasks.json`;

    const tasksJson = await import(path.join(testDataPath, ".vscode/tasks.json"));
    const mockData = (await import(path.join(testDataPath, "mockData.ts"))).default;

    test("README example", async () => {
        mockVscode.setMockData(mockData);
        const input = tasksJson.inputs[0].args;
        const handler = new CommandHandler(
            {...input, useFirstResult: true},
            new UserInputContext(),
            mockExtensionContext as unknown as vscode.ExtensionContext,
            child_process,
        );

        await handler.handle();

        expect(execFileSyncSpy).toHaveBeenCalledTimes(0);
        expect(execSyncSpy).toHaveBeenCalledTimes(1);
        expect(execSyncSpy).toHaveBeenCalledWith(
            `cat ${filePath}`,
            {
                cwd: testDataPath,
                encoding: "utf8",
                env: {
                  FILE: `${filePath}`,
                  PROJECT: "vscode-shell-command",
                  WORKSPACE: testDataPath,
                },
                maxBuffer: undefined,
            },
        );
    });

    test("Command as array of strings", async () => {
        mockVscode.setMockData(mockData);

        const handler = new CommandHandler(
            {command: ["cat", "${file}"], useFirstResult: true},
            new UserInputContext(),
            mockExtensionContext as unknown as vscode.ExtensionContext,
            child_process,
        );

        await handler.handle();

        expect(execFileSyncSpy).toHaveBeenCalledTimes(0);
        expect(execSyncSpy).toHaveBeenCalledTimes(1);
        expect(execSyncSpy).toHaveBeenCalledWith(
            `cat ${filePath}`,
            {
                cwd: testDataPath,
                encoding: "utf8",
                env: undefined,
                maxBuffer: undefined,
            },
        );
    });
});

describe("Multiple workspaces", async () => {
    const testDataPath = path.join(__dirname, "../test/testData/workspaceFolder");
    const tasksJsonA = await import(path.join(testDataPath, "a/.vscode/tasks.json"));
    const tasksJsonB = await import(path.join(testDataPath, "b/.vscode/tasks.json"));

    // Index inputs by taskId
    const inputs = Object.fromEntries(
        [...tasksJsonA.inputs, ...tasksJsonB.inputs]
        .map((input: {args: ShellCommandOptions}) => [input.args.taskId, input]));

    for (const [taskId, expectedResult] of [
        ["a_workspaceFolder", `${testDataPath}/a`],
        ["a_indexedWorkspaceFolder0", `${testDataPath}/a`],
        ["a_indexedWorkspaceFolder1", `${testDataPath}/b`],
        ["a_namedWorkspaceFolderA", `${testDataPath}/a`],
        ["a_namedWorkspaceFolderB", `${testDataPath}/b`],

        ["b_workspaceFolder", `${testDataPath}/b`],
        ["b_indexedWorkspaceFolder0", `${testDataPath}/a`],
        ["b_indexedWorkspaceFolder1", `${testDataPath}/b`],
        ["b_namedWorkspaceFolderA", `${testDataPath}/a`],
        ["b_namedWorkspaceFolderB", `${testDataPath}/b`],
    ]) {
        test(`workspaceFolder ${taskId}`, async () => {
            mockVscode.setMockData((await import(path.join(testDataPath, "mockData.ts"))).default);

            const input = inputs[taskId].args;
            const handler = new CommandHandler(
                input,
                new UserInputContext(),
                mockExtensionContext as unknown as vscode.ExtensionContext,
                child_process,
            );

            await handler.handle();

            expect(execFileSyncSpy).toHaveBeenCalledTimes(0);
            expect(execSyncSpy).toHaveBeenCalledTimes(1);
            expect(execSyncSpy).toHaveBeenCalledWith(
                `echo ${expectedResult}`,
                {
                    cwd: taskId.startsWith("a") ? `${testDataPath}/a` : `${testDataPath}/b`,
                    encoding: "utf8",
                    env: undefined,
                    maxBuffer: undefined,
                },
            );
        });
    }
});

// Related to issue #79
test("Command variable interop", async () => {
    const testDataPath = path.join(__dirname, "../test/testData/commandvariable");

    const tasksJson = await import(path.join(testDataPath, ".vscode/tasks.json"));
    const mockData = (await import(path.join(testDataPath, "mockData.ts"))).default;

    mockVscode.setMockData(mockData);
    const input = tasksJson.inputs[0].args.command.bazelTargets.args;
    const handler = new CommandHandler(
        input,
        new UserInputContext(),
        mockExtensionContext as unknown as vscode.ExtensionContext,
        child_process,
    );

    await handler.handle();

    expect(execFileSyncSpy).toHaveBeenCalledTimes(0);
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
    expect(execSyncSpy).toHaveBeenCalledWith(
        "echo 'ItWorked'",
        {
            cwd: testDataPath,
            encoding: "utf8",
            env: undefined,
            maxBuffer: undefined,
        },
    );
});

test("commandArgs", async () => {
    const testDataPath = path.join(__dirname, "../test/testData/commandArgs");
    const filePath = `${testDataPath}/.vscode/tasks.json`;

    const tasksJson = await import(path.join(testDataPath, ".vscode/tasks.json"));
    const mockData = (await import(path.join(testDataPath, "mockData.ts"))).default;

    mockVscode.setMockData(mockData);
    const input = tasksJson.inputs[0].args;
    const handler = new CommandHandler(
        input,
        new UserInputContext(),
        mockExtensionContext as unknown as vscode.ExtensionContext,
        child_process,
    );

    await handler.handle();

    expect(execSyncSpy).toHaveBeenCalledTimes(0);
    expect(execFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(execFileSyncSpy).toHaveBeenCalledWith(
        `${testDataPath}/command with spaces.sh`,
        [filePath],
        {
            cwd: testDataPath,
            encoding: "utf8",
            env: undefined,
            maxBuffer: undefined,
        },
    );
});

describe("Errors", async () => {
    test("It should trigger an error for an empty result", async () => {
        const testDataPath = path.join(__dirname, "../test/testData/errors");

        const tasksJson = await import(path.join(testDataPath, ".vscode/tasks.json"));
        const mockData = (await import(path.join(testDataPath, "mockData.ts"))).default;

        mockVscode.setMockData(mockData);
        const input = tasksJson.inputs[0].args;
        const handler = new CommandHandler(
            input,
            new UserInputContext(),
            mockExtensionContext as unknown as vscode.ExtensionContext,
            child_process,
        );

        expect(() => handler.handle()).rejects.toThrowError(
            "The command for input 'inputTest' returned empty result.");
    });
});

describe("Argument parsing", () => {
    test("Test defaults and that all boolean properties use parseBoolean", () => {
        expect(CommandHandler.resolveBooleanArgs({ extraTestThing: 42 }))
            .toStrictEqual({
                rememberPrevious: false,
                useFirstResult: false,
                useSingleResult: false,
                extraTestThing: 42,
            });
    });

    test("parseBoolean", () => {
        expect(CommandHandler.parseBoolean(undefined, true)).toBe(true);
        expect(CommandHandler.parseBoolean(undefined, false)).toBe(false);

        expect(CommandHandler.parseBoolean(false, true)).toBe(false);
        expect(CommandHandler.parseBoolean(true, false)).toBe(true);

        expect(CommandHandler.parseBoolean("false", true)).toBe(false);
        expect(CommandHandler.parseBoolean("fALse", true)).toBe(false);
        expect(CommandHandler.parseBoolean("true", false)).toBe(true);
        expect(CommandHandler.parseBoolean("tRUe", false)).toBe(true);

        expect(mockVscode.window.getShowWarningMessageCalls().length).toBe(0);

        expect(CommandHandler.parseBoolean(42, true)).toBe(true);
        expect(CommandHandler.parseBoolean(42, false)).toBe(false);

        expect(mockVscode.window.getShowWarningMessageCalls().length).toBe(2);
    });
});
