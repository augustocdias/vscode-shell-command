# Tasks: Shell Input

This extension aims to extend the possibilities of [input](https://code.visualstudio.com/docs/editor/variables-reference#_input-variables) in task execution. Currently, VSCode supports 3 types of inputs for your tasks:

* promptString
* pickString
* Command

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
          "env": [
            {"name": "WORKSPACE", "value": "${workspaceFolder[0]}"},
            {"name": "FILE", "value": "${file}"},
            {"name": "PROJECT", "value": "${workspaceFolderBasename}"},
          ]
      }
    }
  ]
}
```

By default the extension returns the exact string value that was produced by the shell command and then shown and selected in 'Quick Pick' dialog. However, sometimes it is useful to show more descriptive information than the internal string value that is returned. This can be done by specifying a `fieldSeparator` and making the shell command return lines containing multiple fields separated by that value. Supported fields are:

```text
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

* command: the system command to be executed (must be in PATH)
* cwd: the directory from within it will be executed
* env: array of name-value objects to use as environment variables (overriding the existing ones)
* useFirstResult: skip 'Quick Pick' dialog and use first result returned from the command
* useSingleResult: skip 'Quick Pick' dialog and use the single result if only one returned from the command
* fieldSeparator: the string that separates `value`, `label`, `description` and `detail` fields
* description: shown as a placeholder in 'Quick Pick', provides context for the input
* maxBuffer: largest amount of data in bytes allowed on stdout. Default is 1024 * 1024. If exceeded ENOBUFS error will be displayed
* defaultOptions: if the command doesn't return anything, the list provided will be set for the user to choose from

As of today, the extension supports variable substitution for:

* a subset of predefined variables like `file`, `fileDirName`, `fileBasenameNoExtension`, `fileBasename`, `extension`, `workspaceFolder` and `workspaceFolderBasename`, pattern: `${variable}`
* all config variables, pattern: `${config:variable}`
* all environment variables, pattern: `${env:variable}`
* input variables defined with shellCommand.execute, pattern: `${input:variable}` (these variables are resolved recursively)
* Support for ${command:...} pattern, for example to extract CMake's build directory using `${command:cmake.buildDirectory}`.

For a complete vscode variables documentation please refer to [vscode variables](https://code.visualstudio.com/docs/editor/variables-reference).

## Known Limitations

* When referencing other input values, only those defined using shellCommand.execute are supported
* Ensure you don't have another input with the same exact `inputs.args.command` in your tasks or launch configs as this may confuse the extension

## Misc

[Icon created by Eucalyp - Flaticon](https://www.flaticon.com/)
