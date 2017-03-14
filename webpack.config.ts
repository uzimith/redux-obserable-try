declare var __dirname;
declare var process;
declare function require(moduleName: string): any;
declare var module;

const webpack = require("webpack"); 
const WebpackNotifierPlugin = require("webpack-notifier"); 

module.exports = function(env = {}) {
    return {
        node: {
            __dirname: false,
            __filename: false,
        },
        entry: {
            app: "./app.tsx",
        },
        resolve: {
            extensions: ["*", ".js", "jsx", ".ts", ".tsx"],
        },
        module: {
            loaders: [
                { test: /\.tsx?$/, exclude: ["node_modules", "dist"], loader: ["ts-loader"] },
            ],
        },
        output: {
            path: "dist",
            filename: "[name].js",
        },
        devtool: "#inline-source-map",
        plugins: [new WebpackNotifierPlugin()],
    };
};
