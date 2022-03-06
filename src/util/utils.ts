import * as vscode from 'vscode';

export const activeFile = () => {
    return vscode.window.activeTextEditor?.document;
};

export const activeWorkspaceFolder = () => {
    const file = activeFile();
    return file && vscode.workspace.getWorkspaceFolder(file.uri);
};

export const defaultWorkspaceFolder = () => {
    return activeWorkspaceFolder() ?? vscode.workspace.workspaceFolders?.[0];
};
