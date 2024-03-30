import * as path from 'path'

export default {
  test: {
    exclude: ["node_modules", "out"],
    alias: {
      'vscode': path.join(__dirname, './src/mocks/vscode.ts'),
    }
  }
}
