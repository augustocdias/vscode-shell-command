import * as vscode from 'vscode';
import * as path from 'path';
import { VariableResolveException } from '../util/exceptions';
import { ResolvedVariableContext } from './ResolvedVariableContext';
import { activeFile, activeWorkspaceFolder, defaultWorkspaceFolder } from '../util/utils';

export class VariableResolver {
    protected expressionRegex = /(\$+)\{(.*?)\}/gm;
    protected workspaceRegex = /workspaceFolder\[(\d+)\]/gm;

    protected get activeFile(): vscode.TextDocument | undefined {
        return activeFile();
    }

    protected get activeWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
        return activeWorkspaceFolder();
    }

    async resolve(str: string, resolvedVariables: ResolvedVariableContext): Promise<string> {
        const asyncVariables: [string, number][] = [];
        let diff = 0;

        // Process the synchronous string interpolations
        let result = str.replace(
            this.expressionRegex,
            (match: string, dollars: string, variable: string, offset: number): string => {
                // Defer the asynchronous replacement
                const defer = () => {
                    return asyncVariables.unshift([variable, offset + diff]), '';
                };

                // Omit nested variables
                if (variable.includes('${')) {
                    return match;
                }

                // Every '$$' before '{' will be interpreted as one literal dollar
                const isEscaped = dollars.length % 2 === 0;
                dollars = '$'.repeat(dollars.length / 2);
                if (isEscaped) {
                    diff -= dollars.length;
                    return dollars + `{${variable}}`;
                }

                diff += dollars.length;
                let value: string | undefined;
                const [namespace, name] = variable.split(':') as [string, string?];
                const error = () => {
                    throw new VariableResolveException(variable, 'variable name missing');
                }
                switch (namespace) {
                    case 'env':
                        value = this.resolveEnviron(name ?? error());
                        break;
                    case 'config':
                        value = this.resolveConfig(name ?? error());
                        break;
                    case 'command':
                        // We don't replace these yet, they have to be done asynchronously
                        value = this.resolveCommand(name ?? error(), resolvedVariables, defer);
                        break;
                    case 'input':
                        value = this.resolveInput(name ?? error(), resolvedVariables);
                        break;
                    default:
                        value = this.resolvePredefined(namespace, name, variable, resolvedVariables, defer);
                }
                diff += value.length - match.length;
                return dollars + value;
            },
        );

        // Process the async string interpolations
        await resolvedVariables;
        for (const [key, offset] of asyncVariables) {
            result = result.slice(0, offset) + resolvedVariables.get(key) + result.slice(offset);
        }
        return result;
    }

    protected resolveEnviron(name: string): string {
        return process.env[name] ?? '';
    }

    protected resolveConfig(key: string): string {
        // Workspace configuration (along with merged global configuration)
        const workspaceConfig = vscode.workspace.getConfiguration();

        // Active folder configuration
        const activeFolderConfig = vscode.workspace.getConfiguration('', this.activeWorkspaceFolder?.uri);

        let result = workspaceConfig.get<string>(key) ?? activeFolderConfig.get<string>(key);
        for (const folder of vscode.workspace.workspaceFolders ?? []) {
            if (result !== undefined) {
                break;
            }
            if (folder.uri !== this.activeWorkspaceFolder?.uri) {
                result ??= vscode.workspace.getConfiguration('', folder.uri).get<string>(key);
            }
        }
        return result ?? ''
    }

    protected resolveCommand(command: string, resolvedVariables: ResolvedVariableContext, defer: () => string): string {
        return resolvedVariables.get(`command:${command}`, () => {
            return vscode.commands.executeCommand(command).then(value => {
                if (typeof value === 'string') {
                    return value;
                }
                throw new VariableResolveException(`command:${command}`, 'command must return string value');
            });
        }) ?? defer();
    }

    protected resolveInput(name: string, resolvedVariables: ResolvedVariableContext): string {
        // TODO: resolve asynchronously like command?
        return resolvedVariables.get(`input:${name}`) ?? '';
    }

    protected resolvePredefined(
        name: string, arg: string | undefined, variable: string,
        resolvedVariables: ResolvedVariableContext, defer: () => string
    ): string {
        const selection = () => {
            if (!vscode.window.activeTextEditor) {
                throw new VariableResolveException(variable, 'no open editor');
            }
            return vscode.window.activeTextEditor.selection;
        }

        const activeFile = () => {
            if (!this.activeFile) {
                throw new VariableResolveException(variable, 'no open file');
            }
            return this.activeFile;
        };

        const activeWorkspaceFolder = () => {
            const file = activeFile();
            if (!this.activeWorkspaceFolder) {
                throw new VariableResolveException(variable, `cannot find workspace folder of file '${file}'`);
            }
            return this.activeWorkspaceFolder;
        };

        const workspaceFolder = () => {
            const { workspaceFolders } = vscode.workspace;
            if (!workspaceFolders) {
                throw new VariableResolveException(variable, 'no open workspace');
            }
            if (workspaceFolders.length !== 1) {
                if (arg === undefined) {
                    throw new VariableResolveException(variable, 'unspecified folder name in multi-root workspace');
                }
                const folder = workspaceFolders.find(folder => folder.name === arg);
                if (folder === undefined) {
                    throw new VariableResolveException(variable, `cannot find workspace folder of name '${arg}'`);
                }
                return folder;
            }
            if (arg !== undefined) {
                throw new VariableResolveException(variable, 'superfuous folder name in single-root workspace');
            }
            return workspaceFolders[0];
        };

        switch (name) {
            case 'workspaceRoot':           // deprecated
            case 'workspaceFolder':
                return workspaceFolder().uri.fsPath;
            case 'workspaceRootFolderName': // deprecated
            case 'workspaceFolderBasename':
                return path.basename(workspaceFolder().uri.fsPath);
            case 'file':
                return activeFile().fileName;
            case 'fileWorkspaceFolder':
                return activeWorkspaceFolder().uri.fsPath;
            case 'relativeFile':
                return path.relative(activeFile().fileName, workspaceFolder().uri.fsPath);
            case 'relativeFileDirname':
                return path.relative(path.dirname(activeFile().fileName), workspaceFolder().uri.fsPath) || '.';
            case 'fileBasename':
                return path.basename(activeFile().fileName);
            case 'fileBasenameNoExtension':
                return path.parse(activeFile().fileName).name;
            case 'fileDirName':             // non-standard, backward compatibility
            case 'fileDirname':
                return path.dirname(activeFile().fileName);
            case 'extension':               // non-standard, backward compatibility
            case 'fileExtname':
                return path.extname(activeFile().fileName);
            case 'cwd':
                return resolvedVariables.get('cwd', defaultWorkspaceFolder()?.uri.fsPath ?? process.cwd());
            case 'lineNumber':
                return `${selection().active.line + 1}`;
            case 'selectedText': {
                const range = selection();
                if (range.isEmpty) {
                    throw new VariableResolveException(variable, 'no selection');
                }
                return activeFile().getText(range);
            }
            case 'execPath':
                return vscode.env.appRoot;
            case 'defaultBuildTask':
                return resolvedVariables.get('defaultBuildTask', async () => {
                    const task = (await vscode.tasks.fetchTasks()).find(task => task.group?.isDefault);
                    if (!task) {
                        throw new VariableResolveException(variable, 'no default build task');
                    }
                    return task.name;
                }) ?? defer();
            case 'pathSeparator':
                return path.sep;
            default: {
                // non-standard, backward compatibility: '${workspaceFolder[idx]}'
                const match = this.workspaceRegex.exec(name);
                if (match) {
                    const idx = Number.parseInt(match[1]);
                    const folder = vscode.workspace.workspaceFolders?.[idx];
                    if (!folder) {
                        throw new VariableResolveException(variable, `cannot find workspace folder at ${idx}`);
                    }
                    return folder.uri.fsPath;
                }
                // Leave it as is to match VSCode default behavior
                return `\${${variable}}`;
            }
        }
    }
}
