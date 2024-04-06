export default {
  "staticData": {
    "workspace.workspaceFolders": [
      {
        "uri": {
          "$mid": 1,
          "fsPath": `${__dirname}/a`,
          "external": `file://${__dirname}/a`,
          "path": `${__dirname}/a`,
          "scheme": "file"
        },
        "name": "a",
        "index": 0
      },
      {
        "uri": {
          "$mid": 1,
          "fsPath": `${__dirname}/b`,
          "external": `file://${__dirname}/b`,
          "path": `${__dirname}/b`,
          "scheme": "file"
        },
        "name": "b",
        "index": 1
      }
    ],
    "window.activeTextEditor.document.fileName": `${__dirname}/b/.vscode/tasks.json`,
    "window.activeTextEditor.document.uri.fsPath": `${__dirname}/b/.vscode/tasks.json`,
    "window.activeTextEditor.selection.active.line": 19
  },
  "calls": {
    "workspace.getConfiguration().inspect()": {
      [`["launch","${__dirname}/a","options"]`]: {
        "key": "launch.options"
      },
      [`["launch","${__dirname}/a","inputs"]`]: {
        "key": "launch.inputs"
      },
      [`["tasks","${__dirname}/a","options"]`]: {
        "key": "tasks.options"
      },
      [`["tasks","${__dirname}/a","inputs"]`]: {
        "key": "tasks.inputs",
        "workspaceFolderValue": [
          {
            "id": "a_workspaceFolder",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "taskId": "a_workspaceFolder",
              "command": "echo ${workspaceFolder}",
              "useFirstResult": true
            }
          },
          {
            "id": "a_indexedWorkspaceFolder0",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "taskId": "a_indexedWorkspaceFolder0",
              "command": "echo ${workspaceFolder[0]}",
              "useFirstResult": true
            }
          },
          {
            "id": "a_indexedWorkspaceFolder1",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "taskId": "a_indexedWorkspaceFolder1",
              "command": "echo ${workspaceFolder[1]}",
              "useFirstResult": true
            }
          },
          {
            "id": "a_namedWorkspaceFolderA",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "taskId": "a_namedWorkspaceFolderA",
              "command": "echo ${workspaceFolder:a}",
              "useFirstResult": true
            }
          },
          {
            "id": "a_namedWorkspaceFolderB",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "taskId": "a_namedWorkspaceFolderB",
              "command": "echo ${workspaceFolder:b}",
              "useFirstResult": true
            }
          }
        ]
      },
      [`["launch","${__dirname}/b","options"]`]: {
        "key": "launch.options"
      },
      [`["launch","${__dirname}/b","inputs"]`]: {
        "key": "launch.inputs"
      },
      [`["tasks","${__dirname}/b","options"]`]: {
        "key": "tasks.options"
      },
      [`["tasks","${__dirname}/b","inputs"]`]: {
        "key": "tasks.inputs",
        "workspaceFolderValue": [
          {
            "id": "b_workspaceFolder",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "taskId": "b_workspaceFolder",
              "command": "echo ${workspaceFolder}",
              "useFirstResult": true
            }
          },
          {
            "id": "b_indexedWorkspaceFolder0",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "taskId": "b_indexedWorkspaceFolder0",
              "command": "echo ${workspaceFolder[0]}",
              "useFirstResult": true
            }
          },
          {
            "id": "b_indexedWorkspaceFolder1",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "taskId": "b_indexedWorkspaceFolder1",
              "command": "echo ${workspaceFolder[1]}",
              "useFirstResult": true
            }
          },
          {
            "id": "b_namedWorkspaceFolderA",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "taskId": "b_namedWorkspaceFolderA",
              "command": "echo ${workspaceFolder:a}",
              "useFirstResult": true
            }
          },
          {
            "id": "b_namedWorkspaceFolderB",
            "type": "command",
            "command": "shellCommand.execute",
            "args": {
              "taskId": "b_namedWorkspaceFolderB",
              "command": "echo ${workspaceFolder:b}",
              "useFirstResult": true
            }
          }
        ]
      },
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
        "key": "tasks.inputs"
      }
    }
  }
};
