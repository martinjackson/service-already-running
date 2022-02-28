
const path = require("path");

const pkg = require("./package.json");
const libraryName = pkg.name;

module.exports = {
  mode: "development",
  devtool: "source-map",

  entry: path.join(__dirname, "./src/index.js"),
  target: 'node',
  output: {
    publicPath: "/lib/",
    path: path.join(__dirname, "lib"),
    filename: "index.js",
    library: libraryName,
    libraryTarget: "umd",
    umdNamedDefine: true
  },
  resolve: {
    modules: [path.join(__dirname, "src"), "node_modules"],
  },

  stats: "normal",

}
