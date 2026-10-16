//@ts-check
'use strict';
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/**
 *  Build configuration for extension.ts
 * @type WebpackConfig 
 * */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js environment
  mode: 'none', // Bundle mode none keeps the source as close to the original as possible (set to 'production' when packaging)

  entry: './src/extension.ts', // Extension entry point
  output: {
    // Bundled files are stored in the 'dist' directory
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js', // Output file name
    libraryTarget: 'commonjs2' // Module output format is CommonJS2
  },
  externals: {
    vscode: 'commonjs vscode' // The vscode module is created on the fly and must be excluded. Other modules that cannot be webpacked must also be added here
    // Modules added here must also be added to the .vscodeignore file
  },
  resolve: {
    // Support reading TypeScript and JavaScript files
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/, // Match all .ts files
        exclude: /node_modules/, // Exclude the node_modules directory
        use: [
          {
            loader: 'ts-loader' // Use ts-loader to process TypeScript files
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map', // Use nosources-source-map to generate source maps
  infrastructureLogging: {
    level: "log", // Enable logging for the problem matcher
  }
};

/**
 * Build configuration for webviewScript.ts 
 * @type WebpackConfig 
 * */
const webviewConfig = {
  target: ['web', 'es2022'], // Target the browser environment
  mode: 'none',
  entry:  './src/webview/webviewScript.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'webviewScript.js',
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.ttf$/,
        use: ['file-loader']
      }
    ]
  },
  devtool: 'nosources-source-map',
  plugins: [
    new MonacoWebpackPlugin({languages: ['scheme'], features: []})
  ]
};

module.exports = [extensionConfig, webviewConfig]; // Export both configurations
