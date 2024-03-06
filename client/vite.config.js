import {
  MAPBOX_STYLE,
  MAPBOX_TOKEN,
  SERVER_DOMAIN,
  VITE_DEV_PORT,
} from '@strava-heatmapper/shared/config/dotenv';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import gitDescribe from 'git-describe';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      vue(),
      vueJsx({
        // options are passed on to @vue/babel-plugin-jsx
      }),
    ],
    define: {
      APP_NAME: JSON.stringify('Heatmapper'),
      MAPBOX_TOKEN: JSON.stringify(MAPBOX_TOKEN),
      MAPBOX_STYLE: JSON.stringify(MAPBOX_STYLE),
      GIT_HASH:
        mode === 'production' ? JSON.stringify(gitDescribe.gitDescribeSync().hash) : undefined,
    },
    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      port: VITE_DEV_PORT,
      proxy: {
        '^/api/': { target: SERVER_DOMAIN },
      },
    },
    build: {
      outDir: '../dist/client',
      sourcemap: true,
      emptyOutDir: true,
    },
  };
});
