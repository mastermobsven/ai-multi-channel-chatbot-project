const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'widget.[contenthash].js' : 'widget.js',
      library: 'AIChatWidget',
      libraryTarget: 'umd',
      globalObject: 'this',
      publicPath: '/'
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react']
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx']
    },
    plugins: [
      // Only include HtmlWebpackPlugin in development mode for testing
      ...(isProduction ? [] : [
        new HtmlWebpackPlugin({
          template: './src/index.html',
          filename: 'index.html',
          inject: 'body'
        })
      ])
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'public')
      },
      port: 3005,
      hot: true,
      open: true
    },
    optimization: {
      minimize: isProduction
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map'
  };
};
