import 'material-icons/iconfont/filled.css';

import { createPinia } from 'pinia';
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

createApp(RouterView).use(router).use(createPinia()).mount('body');
