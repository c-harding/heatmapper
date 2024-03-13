declare module '*.vue' {
  import { type DefineComponent } from 'vue';
  const component: DefineComponent<never, never, unknown>;
  export default component;
}
