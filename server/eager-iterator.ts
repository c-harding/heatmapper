import { AbortError } from 'node-fetch';

interface RecursiveIterator<T> {
  next: IteratorResult<T>;
  nextIterator?: Promise<RecursiveIterator<T>>;
}

export const sleep = (delay: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, delay));

export const tick = (): Promise<void> => sleep(0);

const eagerIterator = <T>(asyncIterable: AsyncIterable<T>): AsyncIterableIterator<T> => {
  const returned = false;

  const eagerIteratorStep = async (asyncIterator: AsyncIterator<T>): Promise<RecursiveIterator<T>> => {
    if (returned) return { next: { done: true, value: undefined } };
    await tick();
    try {
      const next = await asyncIterator.next();
      if (next.done) return { next };
      return { next, nextIterator: eagerIteratorStep(asyncIterator) };
    } catch (e) {
      if (e instanceof AbortError) return { next: { done: true, value: undefined } };
      else throw e;
    }
  };

  let iteratorPromise: Promise<RecursiveIterator<T> | undefined> = eagerIteratorStep(
    asyncIterable[Symbol.asyncIterator](),
  );
  return {
    async next() {
      const currentIteratorPromise = iteratorPromise;
      iteratorPromise = currentIteratorPromise.then((currentIterator) => currentIterator?.nextIterator);
      const currentIterator = await currentIteratorPromise;
      return currentIterator?.next ?? { done: true, value: undefined };
    },

    // Handle early termination.
    // A return/break in a for-await loop will call this, preventing further loading.
    async return(value = undefined) {
      iteratorPromise = Promise.resolve(undefined);
      return { done: true, value };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
};

export default eagerIterator;
