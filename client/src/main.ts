import { createHead } from '@unhead/vue';
import { createApp } from 'vue';

import App from '@/App.vue';

createApp(App).use(createHead()).mount('body');
