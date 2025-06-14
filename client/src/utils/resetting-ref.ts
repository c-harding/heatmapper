import { computed, ref } from 'vue';

/**
 * Creates a ref that resets to the value after a delay.
 * Every time value is set, the delay is restarted.
 *
 * This is implemented by adding a proxy on top of the ref.
 */
export function useResettingRef<T>(initial: T, delay: number) {
  const flag = ref<T>(initial);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return computed<T>({
    get(): T {
      return flag.value;
    },

    set(newValue: T) {
      flag.value = newValue;
      clearTimeout(timeoutId);

      if (newValue !== initial) {
        timeoutId = setTimeout(() => {
          flag.value = initial;
          timeoutId = undefined;
        }, delay);
      } else {
        timeoutId = undefined;
      }
    },
  });
}
