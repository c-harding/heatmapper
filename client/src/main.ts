import { createHead } from '@vueuse/head';
import { createApp } from 'vue';

import App from '@/App.vue';

createApp(App).use(createHead()).mount('body');
