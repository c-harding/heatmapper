import { computed, shallowRef, watch, type WatchSource } from 'vue';

export type UndoableState = 'clear' | 'undo' | 'initial';

/**
 * A clear that can be undone until something is set again. The snapshot is taken before clearing,
 * and dropped when one of `changes` changes while there is something to clear.
 */
export function useUndoable<T>({
  active,
  take,
  clear,
  restore,
  changes,
  restorable = () => true,
}: {
  /** True when there is something to clear */
  active: () => boolean;
  /** What a clear would lose, read before clearing */
  take: () => T;
  clear: () => void;
  restore: (snapshot: T) => void;
  /** What to watch for something being set again */
  changes: WatchSource[];
  restorable?: (snapshot: T) => boolean;
}) {
  const previous = shallowRef<T>();

  // Checked against active, as a clear's own changes may arrive after it, through a v-model
  watch(changes, () => {
    if (active()) previous.value = undefined;
  });

  const canRestore = () => previous.value !== undefined && restorable(previous.value);

  const state = computed<UndoableState>(() =>
    active() ? 'clear' : canRestore() ? 'undo' : 'initial',
  );

  function clearOrRestore() {
    if (active()) {
      const snapshot = take();
      clear();
      previous.value = snapshot;
    } else if (previous.value !== undefined && canRestore()) {
      // Restoring sets something again, which drops the snapshot through the watcher
      restore(previous.value);
    }
  }

  return { state, clearOrRestore };
}
