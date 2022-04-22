/* eslint-disable @typescript-eslint/no-var-requires */
const Webpack = require('webpack');

const { VUE_DEV_PORT, SERVER_DOMAIN } = require('@strava-heatmapper/shared/config/dotenv');

if (process.env.NODE_ENV === 'production') {
  const { gitDescribeSync } = require('git-describe');

  process.env.VUE_APP_GIT_HASH = gitDescribeSync().hash;
}

module.exports = {
  chainWebpack(config) {
    config.plugin('html').tap((args) => {
      const [arg, rest] = args;
      return [{ ...arg, title: 'Heatmapper' }, rest];
    });
  },
  configureWebpack: {
    resolve: { extensions: ['*', '.vue', '.js'] },
    optimization: {
      splitChunks: {
        minSize: 10000,
        maxSize: 250000,
      },
    },
    plugins: [
      new Webpack.ProvidePlugin({
        mapboxgl: 'mapbox-gl',
      }),
    ],
  },
  devServer: {
    hot: true,
    port: VUE_DEV_PORT,
    proxy: {
      '^/api/': { target: SERVER_DOMAIN },
    },
  },
  outputDir: '../dist/client',
  productionSourceMap: false,
};
