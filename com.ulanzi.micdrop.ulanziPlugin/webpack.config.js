import path from 'path'
import TerserPlugin from 'terser-webpack-plugin'
import {fileURLToPath} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
    entry: './plugin/app.js',
    target: 'node',
    mode: 'production',
    output: {
        filename: 'app.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'module',
        chunkFormat: 'module'
    },
    module: {
        rules: [
            {
                test: path.resolve(__dirname, 'node_modules/svgdom/src/utils/defaults.js'),
                use: [
                    {
                        loader: 'string-replace-loader',
                        options: {
                            multiple: [
                                {
                                    search: /__dirname\s*=\s*[^\)]+\)/,
                                    replace: ' __dirname = dirname(process.argv[1]'
                                },
                                {
                                    search: /fontDir\s*=\s*[^\)]+\)/,
                                    replace: ' fontDir = join(__dirname, \'fonts/\')'
                                }
                            ]
                        }
                    }
                ]
            },
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [['@babel/preset-env', {targets: {node: 'current'}, modules: false}]]
                    }
                }
            }]
    },
    experiments: {outputModule: true},
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()]
    }
}