# Tasks: Shell Input

This extension aims to extend the possibilities of [input](https://code.visualstudio.com/docs/editor/variables-reference#_input-variables) in task execution. Currently, VSCode supports 3 types of inputs for your tasks:

* `promptString`
* `pickString`
* `command`

None of them allows to get an input from a system command for example. This extension executes a shell command in your OS and each line of the output will be used as a possible input for your task.

Usage example:

![Extension Demo](https://github.com/augustocdias/vscode-shell-command/raw/master/demo.gif)

```json
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
```

By default the extension returns the exact string value that was produced by the shell command and then shown and selected in 'Quick Pick' dialog. However, sometimes it is useful to show more descriptive information than the internal string value that is returned. This can be done by specifying a `fieldSeparator` and making the shell command return lines containing multiple fields separated by that value. Supported fields are:

```
<value>|<label>|<description>|<detail>
```

Here, `<value>` is what is returned as input variable and is not shown in the UI. Instead, `<label>` and `<description>` are shown on a single line and `<detail>` is rendered on a separate line. These fields can also include icons such as `$(git-merge)`. All fields except `<value>` are optional and can be omitted. `fieldSeparator` can be any string value.

Next example shows a process picker very similar to the built-in `${command:pickProcess}`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Echo Process ID",
      "type": "shell",
      "command": "echo ${input:processID}",
      "problemMatcher": []
    }
  ],
  "inputs": [
    {
      "id": "processID",
      "type": "command",
      "command": "shellCommand.execute",
      "args": {
          "command": "ps axww --no-headers k comm -o '%p|%c|%p|%a' | sed -e 's/^\\s*//' -e 's/\\s*|\\s*/|/g'",
          "fieldSeparator": "|",
          "description": "Select the process to attach to"
      }
    }
  ]
}
```

VSCode renders it like this:

![Process Picker](https://github.com/augustocdias/vscode-shell-command/raw/master/process-picker.png)

Arguments for the extension:

* `command`: the system command to be executed (must be in PATH). If given as an array, the elements are joined by spaces.
* `commandArgs`: if provided, `command` is interpreted as the binary to run and `commandArgs` are the arguments. This is useful if the binary you want to run has spaces (like `C:\Program Files\*`). This translates to `child_process.execFileSync(command, commandArgs)`.
* `cwd`: the directory from within it will be executed
* `env`: key-value pairs to use as environment variables (it won't append the variables to the current existing ones. It will replace instead)
* `useFirstResult`: skip 'Quick Pick' dialog and use first result returned from the command
* `useSingleResult`: skip 'Quick Pick' dialog and use the single result if only one returned from the command
* `rememberPrevious`: remember the value you previously selected and default to it the next time (default false) (:warning: **need taskId to be set**)
* `taskId`: Unique id to use for storing the last-used value.
* `fieldSeparator`: the string that separates `value`, `label`, `description` and `detail` fields
* `description`: shown as a placeholder in 'Quick Pick', provides context for the input
* `maxBuffer`: largest amount of data in bytes allowed on stdout. Default is 1024 * 1024. If exceeded ENOBUFS error will be displayed
* `defaultOptions`: if the command doesn't return anything, the list provided will be set for the user to choose from

As of today, the extension supports variable substitution for:

* a subset of predefined variables like `file`, `fileDirName`, `fileBasenameNoExtension`, `fileBasename`, `lineNumber`, `extension`, `workspaceFolder` and `workspaceFolderBasename`, pattern: `${variable}`
* the remembered value (the default value when `rememberPrevious` is true), available as `${rememberedValue}`
* all config variables, pattern: `${config:variable}`
* all environment variables (`tasks.json` `options.env` with fallback to parent process), pattern: `${env:variable}`
* input variables which have been defined with `shellCommand.execute`, pattern: `${input:variable}` (limited supported see below for usage)
* Support for ${command:...} pattern, for example to extract CMake's build directory using `${command:cmake.buildDirectory}`.
* multi-folder workspace support: `${workspaceFolder}` (the folder whose `.vscode/tasks.json` defined the given task), `${workspaceFolder[1]}` (a specific folder by index), and `${workspaceFolder:name}` (a specific folder by name)

For a complete vscode variables documentation please refer to [vscode variables](https://code.visualstudio.com/docs/editor/variables-reference).

Dependent Input Variables Usage example:

```json
{
    "tasks": {
        "version": "2.0.0",
        "tasks": [
            {
                "label": "Nested input",
                "command": "ls ${input:rootDir}/${input:childDir}",
                "type": "shell",
                "problemMatcher": []
            }
        ],
        "inputs": [
            {
                "id": "rootDir",
                "type": "command",
                "command": "shellCommand.execute",
                "args": {
                    "command": "ls -1a"
                }
            },
            {
                "id": "childDir",
                "type": "command",
                "command": "shellCommand.execute",
                "args": {
                    "command": "ls -1a ${input:rootDir}"
                }
            }
        ]
    }
}
```

Example with `commandArgs`:
```json
{
    "tasks": {
        "version": "2.0.0",
        "tasks": [
            {
                "label": "Example with commandArgs",
                "command": "echo ${input:testInput}",
                "type": "shell"
            }
        ],
        "inputs": [
            {
                "id": "testInput",
                "type": "command",
                "command": "shellCommand.execute",
                "args": {
                    "command": "C:\\Program Files\\CMake\\bin\\cmake.exe",
                    "commandArgs": ["-E", "cat", "test-environment"]
                }
            }
        ]
    }
}
```

There are a few limitations to be aware of:

* in the main task command the input variables should appear (left to right) in order of dependence
  * i.e `${input:childDir}` must be to the right of it's dependent variable `${input:rootDir}`
  * this can be worked around by having a dummy `dependsOn` task (or `preLaunchTask` for launch configs) with a dummy echo task which has the proper variable order
* within an input command arg you can only reference other inputs defined with `shellCommand.execute`
* ensure you don't have another input with the same exact `inputs.args.command` in your tasks or launch configs as this may confuse the extension

## Developing and contributing

Please see [./CONTRIBUTING.md](./CONTRIBUTING.md) for documentation on developing this extension.

## Misc

[Icon created by Eucalyp - Flaticon](https://www.flaticon.com/)
