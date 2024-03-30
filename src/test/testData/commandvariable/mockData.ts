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
        "name": "commandvariable",
        "index": 0
      }
    ],
    "window.activeTextEditor.document.fileName": `${__dirname}/.vscode/tasks.json`,
    "window.activeTextEditor.document.uri.fsPath": `${__dirname}/.vscode/tasks.json`,
    "window.activeTextEditor.selection.active.line": 35
  },
  "calls": {
    "workspace.getConfiguration().inspect()": {
      [`["launch","${__dirname}","options"]`]: {
        "key": "launch.options"
      },
      [`["launch","${__dirname}","inputs"]`]: {
        "key": "launch.inputs"
      },
      [`["tasks","${__dirname}","options"]`]: {
        "key": "tasks.options"
      },
      [`["tasks","${__dirname}","inputs"]`]: {
        "key": "tasks.inputs",
        "workspaceValue": [
          {
            "id": "testShellCommand",
            "type": "command",
            "command": "extension.commandvariable.pickStringRemember",
            "args": {
              "description": "Choose a target",
              "key": "selectedBazelTarget",
              "rememberTransformed": true,
              "options": [
                {
                  "label": "Select Target",
                  "value": "${command:bazelTargets}",
                  "description": "NOTE: It may take some time for the selection list to be displayed"
                }
              ],
              "command": {
                "bazelTargets": {
                  "command": "shellCommand.execute",
                  "args": {
                    "command": "echo 'ItWorked'",
                    "cwd": "${workspaceFolder}",
                    "useFirstResult": true
                  }
                }
              }
            }
          }
        ],
        "workspaceFolderValue": [
          {
            "id": "testShellCommand",
            "type": "command",
            "command": "extension.commandvariable.pickStringRemember",
            "args": {
              "description": "Choose a target",
              "key": "selectedBazelTarget",
              "rememberTransformed": true,
              "options": [
                {
                  "label": "Select Target",
                  "value": "${command:bazelTargets}",
                  "description": "NOTE: It may take some time for the selection list to be displayed"
                }
              ],
              "command": {
                "bazelTargets": {
                  "command": "shellCommand.execute",
                  "args": {
                    "command": "echo 'ItWorked'",
                    "cwd": "${workspaceFolder}",
                    "useFirstResult": true
                  }
                }
              }
            }
          }
        ]
      }
    }
  }
};
