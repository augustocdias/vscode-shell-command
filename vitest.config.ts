const path = require('path')

module.exports = {
  test: {
    exclude: ["node_modules", "out"],
    alias: {
      'vscode': path.join(__dirname, './src/mocks/vscode.ts'),
    }
  }
}
