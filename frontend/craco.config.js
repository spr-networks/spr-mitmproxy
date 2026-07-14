const InlineChunkHtmlPlugin = require('react-dev-utils/InlineChunkHtmlPlugin')

module.exports = {
  webpack: {
    alias: { fs: false, child_process: false },
    experiments: {
      asyncWebAssembly: true
    },

    configure: (webpackConfig) => {
      webpackConfig.module.rules.push({
        test: /\.gz$/,
        type: 'asset/inline'
      })

      webpackConfig.module.rules.push({
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: { inline: 'no-fallback' }
        }
      })

      // SPR renders plugin HTML with iframe srcdoc. Inline scripts and styles so
      // the browser does not resolve plugin assets against the host app's URL.
      let inlineChunkPluginFound = false
      let htmlPluginFound = false
      webpackConfig.plugins.forEach((plugin) => {
        if (plugin instanceof InlineChunkHtmlPlugin) {
          plugin.tests = [/.+[.]js/]
          inlineChunkPluginFound = true
        }
        // react-scripts may resolve its own html-webpack-plugin copy, so an
        // instanceof check against the app's copy is not reliable here.
        if (plugin.constructor?.name === 'HtmlWebpackPlugin') {
          plugin.userOptions.inject = 'body'
          plugin.userOptions.scriptLoading = 'blocking'
          htmlPluginFound = true
        }
      })
      if (!inlineChunkPluginFound) {
        throw new Error('InlineChunkHtmlPlugin not found')
      }
      if (!htmlPluginFound) {
        throw new Error('HtmlWebpackPlugin not found')
      }

      const oneOfRule = webpackConfig.module.rules.find(
        (rule) => Array.isArray(rule.oneOf)
      )
      if (!oneOfRule) {
        throw new Error('webpack oneOf rules not found')
      }

      // The shared plugin shell ships JSX source so plugin frontends can use
      // the exact same theme tokens and primitives as the SPR host.
      const appBabel = oneOfRule.oneOf.find(
        (loader) =>
          loader.loader?.includes('babel-loader') && loader.include
      )
      if (!appBabel) {
        throw new Error('application babel-loader not found')
      }
      oneOfRule.oneOf.unshift({
        test: /\.(js|mjs|jsx)$/,
        include: [
          /node_modules[\\/]@gluestack-ui[\\/]/,
          /node_modules[\\/]@gluestack-style[\\/]/,
          /node_modules[\\/]@legendapp[\\/]/,
          /node_modules[\\/]@spr-networks[\\/]plugin-ui[\\/]/
        ],
        loader: appBabel.loader,
        options: { ...appBabel.options, sourceType: 'unambiguous' }
      })

      oneOfRule.oneOf.forEach((loader) => {
        if (
          loader.test?.test?.('test.module.css') ||
          loader.test?.test?.('test.module.scss')
        ) {
          loader.use?.forEach((entry) => {
            if (
              entry.loader &&
              entry.loader.includes('mini-css-extract-plugin')
            ) {
              entry.loader = require.resolve('style-loader')
              entry.options = {}
            }
          })
        }
      })

      return webpackConfig
    }
  }
}
