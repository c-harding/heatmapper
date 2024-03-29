import {
  MAPBOX_STYLE,
  MAPBOX_TOKEN,
  SERVER_PORT,
  USE_STRAVA_ICONS,
  VALIDATE_USER_BEFORE_CACHE,
  VITE_APP_NAME,
  VITE_DEV_PORT,
} from '@strava-heatmapper/shared/config/dotenv';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import gitDescribe from 'git-describe';
import { resolve } from 'path';
import { defineConfig } from 'vite';

process.env.VITE_APP_NAME ||= VITE_APP_NAME;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      vue({ script: { propsDestructure: true } }),
      vueJsx({
        // options are passed on to @vue/babel-plugin-jsx
      }),
    ],
    define: {
      MAPBOX_TOKEN: JSON.stringify(MAPBOX_TOKEN),
      MAPBOX_STYLE: JSON.stringify(MAPBOX_STYLE),
      USE_STRAVA_ICONS: JSON.stringify(USE_STRAVA_ICONS),
      VALIDATE_USER_BEFORE_CACHE: JSON.stringify(VALIDATE_USER_BEFORE_CACHE),
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
        '^/api/': { target: `http://localhost:${SERVER_PORT}`, ws: true },
      },
    },
    build: {
      outDir: '../dist/client',
      sourcemap: true,
      emptyOutDir: true,
    },
  };
});
