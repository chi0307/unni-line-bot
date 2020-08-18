const path = require('path');
const nodeExternals = require('webpack-node-externals');
// nodemon插件 自動重啟
const NodemonPlugin = require('nodemon-webpack-plugin');
// 每次編譯前清除清理資料夾
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  target: 'node',
  // 根資料夾
  context: path.resolve(__dirname, 'src'),
  // 進入點
  entry: {
    index: './index.js',
  },
  // 輸出
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [],
  },
  resolve: {
    // 解析指定副檔名檔案
    extensions: ['.js'],
  },
  externals: [nodeExternals()],
  plugins: [new NodemonPlugin(), new CleanWebpackPlugin()],
};
