export default {
  "calls": {
    "workspace.getConfiguration().inspect()": {
      "[\"tasks\",null,\"inputs\"]": {
        "key": "tasks.inputs",
        "workspaceValue": [
          {
            "id": "inputTest",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "command": "python",
              "commandArgs": [
                  "-v"
              ],
              "stdin": "print('hello world')",
            }
          }
        ]
      }
    }
  },
  "staticData": {
    "window.activeTextEditor.document.fileName": `${__dirname}/.vscode/tasks.json`,
    "workspace.workspaceFolders": [
      {
        "uri": {
          "$mid": 1,
          "fsPath": `${__dirname}`,
          "external": `file://${__dirname}}`,
          "path": `${__dirname}`,
          "scheme": "file"
        },
        "name": "vscode-shell-command",
        "index": 0
      }
    ]
  }
};
