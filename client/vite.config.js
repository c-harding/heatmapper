import {
  MAPBOX_STYLE,
  MAPBOX_TOKEN,
  SERVER_PORT,
  USE_STRAVA_ICONS,
  ATTRIBUTION,
  VALIDATE_USER_BEFORE_CACHE,
  VITE_APP_NAME,
  VITE_DEV_PORT,
} from '@strava-heatmapper/shared/config/dotenv';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import gitDescribe from 'git-describe';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

process.env.VITE_APP_NAME ||= VITE_APP_NAME;

const manualChunks = {
  config: ['@/utils/config'],
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: '../node_modules/@mapbox/mapbox-gl-rtl-text/dist/mapbox-gl-rtl-text.js',
            dest: '.',
          },
        ],
      }),
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
      ATTRIBUTION: JSON.stringify(ATTRIBUTION),
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
      rollupOptions: {
        output: {
          manualChunks,
          chunkFileNames: ({ name }) => (name in manualChunks ? '[name].js' : '[name]-[hash].js'),
        },
      },
    },
  };
});
