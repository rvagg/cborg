const fs = require('fs')
const path = require('path')

const testRe = /test-.*\.js$/
const entries = fs.readdirSync(path.join(__dirname, '..'))
  .filter((f) => testRe.test(f))
  .map((f) => path.join(__dirname, '..', f))

module.exports = {
  mode: 'development',
  entry: entries,
  output: {
    path: __dirname,
    filename: 'cborg.bundle.js'
  },
  devtool: 'cheap-module-source-map',
  module: {
    rules: [
      {
        test: testRe,
        exclude: /node_modules/,
        use: [
          {
            loader: 'mocha-loader',
            options: {
              reporter: 'spec'
            }
          }
        ]
      }
    ]
  }
}
