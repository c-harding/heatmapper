import { computed, inject, type MaybeRef, onBeforeUnmount, provide, reactive, unref } from 'vue';

import { stickyHeaderToken, type StickyHeaderValues } from './StickyHeader';

export function provideStickyHeader(ownHeight?: MaybeRef<number>) {
  const allHeights = reactive(
    new Map<symbol, MaybeRef<number>>([[Symbol('ownHeight'), ownHeight ?? 0]]),
  );

  const height = computed(() =>
    [...allHeights.values()].reduce<number>((acc, val) => acc + unref(val), 0),
  );

  const heightPx = computed(() => `${height.value}px`);

  provide(stickyHeaderToken, {
    registerHeader: (height, debugLabel) => {
      const key = Symbol(debugLabel);
      allHeights.set(key, height);
      onBeforeUnmount(() => allHeights.delete(key));
    },
    height,
    heightPx,
  });

  return { height, heightPx };
}

export default function useStickyHeader(
  ownHeight?: MaybeRef<number>,
  debugLabel?: string,
): StickyHeaderValues {
  const stickyHeader = inject(stickyHeaderToken);

  if (!stickyHeader) {
    throw new Error('Sticky header has not been provided');
  }

  if (ownHeight !== undefined) {
    stickyHeader?.registerHeader(ownHeight, debugLabel);
  }

  return stickyHeader;
}
