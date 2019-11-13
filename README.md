# Tasks: Shell Input

This extension aims to extend the possibilities of [input](https://code.visualstudio.com/docs/editor/variables-reference#_input-variables) in task execution. Currently, VSCode supports 3 types of inputs for your tasks: 
* promptString
* pickString
* Command

None of them allows to get an input from a system command for example. This extension executes a shell command in your OS and each line of the output will be used as a possible input for your task.

Usage example: 

![Extension Demo](https://github.com/augustocdias/vscode-shell-command/raw/master/demo.gif)

```
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Echo Project File",
      "type": "shell",
      "command": "echo ${input:inputTest}",
      "problemMatcher": []
    }
  ],
  "inputs": [
    {
      "id": "inputTest",
      "type": "command",
      "command": "shellCommand.execute",
      "args": {
          "command": "cat ${file}",
          "cwd": "${workspaceFolder}"
          "env": {
              "WORKSPACE": "${workspaceFolder[0]}",
              "FILE": ${file},
              "PROJECT": ${workspaceFolderBasename}

          }
      }
    }
  ]
}
```

Arguments for the extension:
* command: the system command to be executed (must be in PATH)
* cwd: the directory from within it will be executed
* env: key-value pairs to use as environment variables (it won't append the variables to the current existing ones. It will replace instead)
* useFirstResult: skip 'Quick Pick' dialog and use first result returned from the command

In the moment it supports only `file`, `fileDirName`, `workspaceFolder` and `workspaceFolderBasename` [vscode variables](https://code.visualstudio.com/docs/editor/variables-reference).
