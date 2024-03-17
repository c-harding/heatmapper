type Callback<T extends unknown[]> = (...args: T) => void;

/**
 * Combine an array of (possibly undefined) callbacks into a single (possibly undefined) callback
 *
 * @param functionRefs a list of callback functions
 * @returns a ref to a single function that calls all passed functions simultaneously, or undefined if all functions are undefined
 */
export function combineCallbacks<T extends unknown[]>(
  functions: (undefined | Callback<T>)[],
): undefined | Callback<T> {
  const nonNullFunctions = functions.filter((ref): ref is Callback<T> => !!ref);
  if (nonNullFunctions.length) {
    return (...args) => nonNullFunctions.forEach((f) => f(...args));
  } else {
    return undefined;
  }
}
