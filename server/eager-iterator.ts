import { AbortError } from 'node-fetch';

type RecursiveIterator<T> =
  | {
      next: IteratorResult<T>;
      nextIterator?: Promise<RecursiveIterator<T>>;
    }
  | { error: unknown };

export const sleep = (delay: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, delay));

export const tick = (): Promise<void> => sleep(0);

const eagerIterator = <T>(asyncIterable: AsyncIterable<T>): AsyncIterableIterator<T> => {
  let returned = false;

  // Never rejects: a step fetched ahead may fail after the consumer has stopped reading, and a
  // rejection nobody awaits would end the process. The error is held until next() reaches it.
  const eagerIteratorStep = async (asyncIterator: AsyncIterator<T>): Promise<RecursiveIterator<T>> => {
    if (returned) return { next: { done: true, value: undefined } };
    await tick();
    try {
      const next = await asyncIterator.next();
      if (next.done) return { next };
      return { next, nextIterator: eagerIteratorStep(asyncIterator) };
    } catch (e) {
      if (e instanceof AbortError) return { next: { done: true, value: undefined } };
      else return { error: e };
    }
  };

  let iteratorPromise: Promise<RecursiveIterator<T> | undefined> = eagerIteratorStep(
    asyncIterable[Symbol.asyncIterator](),
  );
  return {
    async next() {
      const currentIteratorPromise = iteratorPromise;
      iteratorPromise = currentIteratorPromise.then((currentIterator) =>
        currentIterator && 'next' in currentIterator ? currentIterator.nextIterator : undefined,
      );
      const currentIterator = await currentIteratorPromise;
      if (currentIterator && 'error' in currentIterator) throw currentIterator.error;
      return currentIterator?.next ?? { done: true, value: undefined };
    },

    // Handle early termination.
    // A return/break in a for-await loop will call this, preventing further loading.
    async return(value = undefined) {
      returned = true;
      iteratorPromise = Promise.resolve(undefined);
      return { done: true, value };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
};

export default eagerIterator;
