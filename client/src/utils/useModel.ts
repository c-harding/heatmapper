import { computed } from 'vue';

export const useModel =
  <T, Name extends string>(name: Name, props: { [name in Name]: T }) =>
  (emit: (name: `update:${Name}`, arg: T) => void) => {
    return computed<T>({
      get() {
        return props[name];
      },
      set(value) {
        emit(`update:${name}`, value);
      },
    });
  };
