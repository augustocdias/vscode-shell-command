export default {
  "staticData": {
    "workspace.workspaceFolders": [
      {
        "uri": {
          "$mid": 1,
          "fsPath": `${__dirname}`,
          "external": `file://${__dirname}`,
          "path": `${__dirname}`,
          "scheme": "file"
        },
        "name": "pickStringRemember",
        "index": 0
      }
    ],
    "window.activeTextEditor.document.fileName": `${__dirname}/.vscode/tasks.json`,
    "window.activeTextEditor.document.uri.fsPath": `${__dirname}/.vscode/tasks.json`,
    "window.activeTextEditor.selection.active.line": 24
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
            "id": "getOptionString",
            "type": "command",
            "command": "extension.commandvariable.transform",
            "args": {
              "key": "optionString",
              "text": "${command:getOptionString}",
              "command": {
                "getOptionString": {
                  "command": "shellCommand.execute",
                  "variableSubstArgs": true,
                  "args": {
                    "command": "echo You selected ${pickStringRemember:pickAnOption}",
                    "useFirstResult": true,
                    "taskId": "test task id",
                    "cwd": "${workspaceFolder}"
                  },
                  "pickStringRemember": {
                    "pickAnOption": {
                      "key": "selectedOption",
                      "description": "Pick an option",
                      "options": [
                        {
                          "label": "Previous option:",
                          "value": "${remember:selectedOption}",
                          "description": "${remember:selectedOption}"
                        },
                        "Option A",
                        "Option B",
                        "Option C",
                        "Option D"
                      ]
                    }
                  }
                }
              }
            }
          },
          {
            "id": "selectedOption",
            "type": "command",
            "command": "extension.commandvariable.remember",
            "args": {
              "key": "selectedOption"
            }
          }
        ]
      }
    }
  }
};
