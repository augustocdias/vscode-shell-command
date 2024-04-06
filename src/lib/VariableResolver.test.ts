import * as path from "path";

import { expect, test } from 'vitest';

import { VariableResolver } from './VariableResolver';
import { UserInputContext } from './UserInputContext';
import * as mockVscode from '../mocks/vscode';

test('variable types', async () => {
    const workspaceFolder = path.join(__dirname, "../test/testData/variableResolver");
    const tasksJson = await import(path.join(workspaceFolder, ".vscode/tasks.json"));
    const filePath = `${workspaceFolder}/.vscode/tasks.json`;
    mockVscode.setMockData((await import(path.join(workspaceFolder, "mockData.ts"))).default);

    const input = {...tasksJson.inputs[0], workspaceIndex: 0};
    const rememberedValue = "Back in my day";
    const userInputContext = new UserInputContext();
    const resolver = new VariableResolver(input, userInputContext, rememberedValue);

    for (const [key, value] of Object.entries({
        "workspaceFolder": workspaceFolder,
        "workspaceFolderBasename": "vscode-shell-command",
        "fileBasenameNoExtension": "tasks",
        "fileBasename": "tasks.json",
        "file": filePath,
        "lineNumber": "42",
        "extension": ".json",
        "fileDirName": `${workspaceFolder}/.vscode`,
        "rememberedValue": rememberedValue,
        "invalid": "",
    })) {
        expect(await resolver.resolve("prefix ${" + key + "} suffix"))
            .toBe(`prefix ${value} suffix`);
    }
});
