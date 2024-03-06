import type { Ref } from 'vue';
import { readonly, ref, watch } from 'vue';

/**
 * Returns an ref that is true if the provided value is or has been true.
 *
 * @param getter A getter of a boolean value
 */
export const useHasBeenTrue = (getter: () => boolean): Readonly<Ref<boolean>> => {
  const hasBeenTrue = ref(getter());
  if (!hasBeenTrue.value) {
    const cancelWatcher = watch(getter, (isTrue) => {
      if (isTrue) {
        hasBeenTrue.value = true;
        cancelWatcher();
      }
    });
  }
  return readonly(hasBeenTrue);
};
