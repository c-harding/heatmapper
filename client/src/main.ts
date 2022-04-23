import { createHead } from '@vueuse/head';
import { createApp } from 'vue';
import VueHead from 'vue-head';

import App from '@/App.vue';

createApp(App)
  // VueHead is used for Options components
  .use(VueHead)
  // createHead is used for Composition components
  .use(createHead())
  .mount('body');
