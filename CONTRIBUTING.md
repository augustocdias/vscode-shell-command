# Contributing

## How to test the extension

The easiest way to test the extension is to use the configured debug task.
Open the debug tab of VSCode, select "Run Extension" from the dropdown, and press the play button.
This will open a new instance of VSCode with the plugin installed.
You can add breakpoints, and any `console.log`s in the code will appear in the "DEBUG CONSOLE".

## How to package the extension

[Reference](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

```bash
npm install --global @vscode/vsce
vsce package
```
