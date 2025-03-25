import { computed, type ComputedRef, reactive, type Ref, ref } from 'vue';

export type Dismisser = () => void;
export type ShowError = (message: string, timeout?: number) => Dismisser;

export interface IndexedErrorMessage {
  index: 0;
  errorMessage?: ErrorMessage;
}

interface ErrorPosition {
  targetBox?: DOMRect;
  frame?: Element;
}

export interface ErrorMessage extends ErrorPosition {
  message: string;
}

interface UseErrorTooltip {
  targetRef: Ref<HTMLButtonElement | undefined>;
  errorMessage: ComputedRef<ErrorMessage | undefined>;
  showError: ShowError;
  dismissLast: () => void;
}

export function useErrorTooltip(): UseErrorTooltip {
  const targetRef = ref<HTMLButtonElement>();
  const indexedErrorMessage = reactive<IndexedErrorMessage>({
    index: 0,
  });

  function getErrorPosition(): ErrorPosition {
    return {
      targetBox: targetRef.value?.getBoundingClientRect(),
      frame: targetRef.value?.closest(':modal[open]') ?? document.body,
    };
  }

  function dismissLast() {
    indexedErrorMessage.errorMessage = undefined;
  }

  const showError: ShowError = (message, timeout = 5000) => {
    const newIndex = indexedErrorMessage.index + 1;
    indexedErrorMessage.index++;
    indexedErrorMessage.errorMessage = {
      ...getErrorPosition(),
      message: String(message),
    };
    const dismiss = () => {
      if (indexedErrorMessage.index === newIndex) dismissLast();
    };
    if (timeout) setTimeout(dismiss, timeout);
    return dismiss;
  };

  return {
    targetRef,
    errorMessage: computed(() => indexedErrorMessage.errorMessage),
    showError,
    dismissLast,
  };
}
