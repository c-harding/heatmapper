import { useHead } from '@unhead/vue';

export function useMaterialIcons() {
  useHead({
    link: [
      {
        href: 'https://fonts.googleapis.com/icon?family=Material+Icons&display=block',
        rel: 'stylesheet',
      },
    ],
  });
}
