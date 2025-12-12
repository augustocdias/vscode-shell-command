# Change Log

## [1.20.0] 2025-12-12

- Add extension setting to ignore focus out (#162)

## [1.19.1] 2025-07-02

- Fix empty string perceived when dismissing the popup (#151)

## [1.19.0] 2025-07-02

- Allow not filtering empty results (#155)

## [1.18.3] 2025-05-28

- Extracted the `taskId` criteria while searching the input. (#131)

## [1.18.2] 2025-05-15

- Fix task arguments handling to prevent incorrect values
- Fix `stdinResolveVars` using wrong task argument

## [1.18.1] 2025-05-13

- Support stdinResolveVars (#145)

## [1.18.0] 2025-05-06

- Support stdin (#145)

## [1.17.0] 2025-03-12

- Make input history persistent (#140)
- Enforce unique taskId (#131)

## [1.16.0] 2025-02-04

- Add `rememberAs` field to share history between inputs.

## [1.15.0] 2025-01-02

- Add variable resolver for ${prompt} (#123)

## [1.14.1] 2024-12-24

- Fix bug with multiselect active vs selected (#127)

## [1.14.0] 2024-11-09

- Add support for `command:shellCommand.promptString` (#123)

## [1.13.1] 2024-11-09

- Add support for warning if the command outputs on stderr (warnOnStderr)

## [1.13.0] 2024-11-09

- Fix default value not recorded for useFirstResult / useSingleResult (#117)
- Add support for ${taskId:} input variables
- Do not reset user input context (#95)
- Add workspaceFolder to executeCommand (#116)

## [1.12.4] 2024-10-03

- Work around VSCode bug with activeItems and selectedItems (#112)

## [1.12.3] 2024-10-03

- Fix custom values not being returned (#113)
- Ensure value set from VSCode callback before resolving (related to #112)

## [1.12.2] 2024-10-02

- Fix backwards compatibility of default values (#110)

## [1.12.1] 2024-10-02

- Fix errors with default values (#107)

## [1.12.0] 2024-09-30

- Add support for custom values (#33)
- Fix bug in pick selection (#95)
- Add support for multiselect (#82)

## [1.11.0] 2024-09-21

- Add support for getting results from stderr (fix issue #86)
- Improve error handling
- Improve parsing of boolean arguments

## [1.10.0] - 2024-04-06

- Support commands with spaces. Add `commandArgs` property, which causes `execFileSync` to be called with `command`.

## [1.9.2] - 2024-03-11

- Fix bug bug with command as array of args introduced in #74

## [1.9.1] - 2024-02-08

- Fix bug introduced in 1.9.0: #79

## [1.9.0] - 2024-01-26

- Add `defaultValue` variable
- Support command as array of string
- Better support for multi-folder workspaces
  - Make `${workspaceFolder}` resolve to the folder in which the task is defined, not the default folder.
  - Support `${workspaceFolder:name}`
- Add support for `tasks.json` `options.env` object
- Add `lineNumber` variable

## [1.8.2] - 2023-03-01

- Fix broken multi root workspace support for input variables

## [1.8.1] - 2023-02-27

- Fixed issue where the fieldSeparator was not properly resolved

## [1.8.0] - 2023-02-15

- Added `rememberPrevious` option and force user to set the taskId if using rememberPrevious
- Use `taskId` option to solve conflicts when multiple inputs have the same command

## [1.7.5] - 2022-11-10

- Fix userInputContext auto reset invalid

## [1.7.4] - 2022-07-27

- Fix error where tasks defined in root workspaces failed to resolve variables

## [1.7.3] - 2022-07-25

- Fix error where tasks defined in root workspaces failed to resolve variables

## [1.7.2] - 2022-07-19

- Add icon

## [1.7.1] - 2022-07-19

- Fix multi root inputs

## [1.7.0] - 2022-01-04

- Added `fileBasename`, `extension` and `fileBasenameNoExtension` variables
- Added `defaultOptions` option

## [1.6.1] - 2021-11-16

- Use value instead of label from the user input

## [1.6.0] - 2021-10-21

- Added support for ${command:...} variable substitutions
- Fix env and cwd's resolution
- recordInput when use firstresult

## [1.5.1] - 2021-09-21

- Config resolution will work for sub-projects present in a workspace

## [1.5.0] - 2021-07-08

- Added basic variable dependency resolution

## [1.4.0] - 2021-06-30

- Added `maxBuffer` option

## [1.3.0] - 2021-02-15

- Added possibility to parse config for the parameters

## [1.2.0] - 2021-02-04

- Added `fieldSeparator` and `description` options

## [1.1.0] - 2020-07-23

- Setting current folder as default for working directory from command

## [1.0.0] - 2020-07-23

- Added `useSingleResult` option

## [0.4.2] - 2020-02-24

- Rolling back current env shell as it breaks on windows

## [0.4.1] - 2019-12-16

- Using current environment shell to execute the commands

## [0.4.0] - 2019-11-13

- Added `fileDirName` option

## [0.3.0] - 2019-07-23

- Added `useFirstResult` option
- Using direct regex for possible line endings instead of OS constant.

## [0.2.0] - 2019-04-05

- Added support to `file`, `workspaceFolder` and `workspaceFolderBasename` variables

## [0.1.0] - 2019-03-29

- Initial release
