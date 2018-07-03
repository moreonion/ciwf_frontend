
const path = require('path')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = (env, args) => ({
  context: path.join(__dirname, `formtool_assets/`),
  entry: './src/main.js',
  output: {
    filename: `ciwf_formtool.js`,
    path: path.join(__dirname, `formtool_assets/${args.mode}/`)
  },
  plugins: [
    // Clear output folder before files are generated
    new CleanWebpackPlugin([`formtool_assets/${args.mode}`]),
    // Output styles as CSS file (not JS or style tag)
    new MiniCssExtractPlugin({
      filename: `ciwf_formtool.css`,
    }),
  ],
  // Enable source maps (in development mode)
  devtool: args.mode === 'development' ? 'source-map' : false,
  module: {
    rules: [{
      // ----------------------------------------
      // Handle Sass
      //----------------------------------------
      test: /\.(scss)$/,
      use: [{
        // 4. Output CSS file
        loader: MiniCssExtractPlugin.loader,
      }, {
        // 3. Translate CSS into CommonJS modules
        loader: 'css-loader',
        options: {
          minimize: args.mode === 'production',
          sourceMap: args.mode === 'development',
        }
      }, {
        // 2. Post-process CSS (autoprefix)
        loader: 'postcss-loader',
        options: {
          plugins: function () {
            return [
              require('autoprefixer'),
            ];
          },
          sourceMap: args.mode === 'development',
        }
      }, {
        // 1. Compile Sass to CSS
        loader: 'sass-loader',
        options: {
          outputStyle: 'expanded',
          sourceMap: args.mode === 'development',
        }
      }]
    }, {
      // ----------------------------------------
      // Handle images
      //----------------------------------------
      test: /\.(png|jp(e*)g|gif|svg)$/,
      use: [{
        // Convert tiny images to inline base64 strings.
        // Copy larger images to output folder and ammend the path accordingly.
        loader: 'url-loader',
        options: {
          limit: 8000,
          name: args.mode === 'production' ?
            'images/[name]--[hash].[ext]' :
            'images/[name].[ext]',
        }
      }]
    }, {
      // ----------------------------------------
      // Handle fonts
      //----------------------------------------
      test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
      use: [{
        // Copy to output folder and ammend the path accordingly.
        loader: 'url-loader',
        options: {
          limit: 8000,
          name: 'fonts/[name].[ext]',
        }
      }]
    }, {
      // ----------------------------------------
      // Shim `this` for mo-cookiebar
      //----------------------------------------
      test: require.resolve('mo-cookiebar'),
      use: 'imports-loader?this=>window,define=>false'
    }]
  },
})
