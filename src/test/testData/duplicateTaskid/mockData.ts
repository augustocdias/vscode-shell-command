export default {
  "staticData": {
    "workspace.workspaceFolders": [
      {
        "uri": {
          "$mid": 1,
          "fsPath": __dirname,
          "external": `file://${__dirname}`,
          "path": __dirname,
          "scheme": "file"
        },
        "name": "duplicateTaskid",
        "index": 0
      }
    ],
    "window.activeTextEditor.document.fileName": `${__dirname}/.vscode/tasks.json`,
    "window.activeTextEditor.document.uri.fsPath": `${__dirname}/.vscode/tasks.json`,
    "window.activeTextEditor.selection.active.line": 7
  },
  "calls": {
    "workspace.getConfiguration().inspect()": {
      "[\"launch\",null,\"options\"]": {
        "key": "launch.options"
      },
      "[\"launch\",null,\"inputs\"]": {
        "key": "launch.inputs"
      },
      "[\"tasks\",null,\"options\"]": {
        "key": "tasks.options"
      },
      "[\"tasks\",null,\"inputs\"]": {
        "key": "tasks.inputs",
        "workspaceValue": [
          {
            "id": "inputTest2",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "taskId": "inputTest",
              "command": "echo inputTest2",
              "multiselect": true,
              "cwd": "${workspaceFolder}",
              "env": {
                "WORKSPACE": "${workspaceFolder[0]}",
                "FILE": "${file}",
                "PROJECT": "${workspaceFolderBasename}"
              }
            }
          },
          {
            "id": "inputTest",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "taskId": "inputTest",
              "rememberAs": "inputTest",
              "rememberPrevious": true,
              "command": "echo inputTest",
              "cwd": "${workspaceFolder}",
              "env": {
                "WORKSPACE": "${workspaceFolder[0]}",
                "FILE": "${file}",
                "PROJECT": "${workspaceFolderBasename}"
              }
            }
          }
        ]
      }
    }
  }
};
