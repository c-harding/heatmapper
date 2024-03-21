import { createHead } from '@unhead/vue';
import { createApp } from 'vue';
import { createRouter, createWebHistory, RouterView } from 'vue-router';

import App from '@/App.vue';

const routes = [
  { path: '/', component: App, props: { routes: false } },
  { path: '/routes', component: App, props: { routes: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

createApp(RouterView).use(router).use(createHead()).mount('body');
