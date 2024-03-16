<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import Icon from '../Icon.vue';
import { type ErrorMessage } from './useErrorTooltip';

const props = defineProps<{
  errorMessage?: ErrorMessage;

  onDismiss?: () => void;
}>();

const MIN_PADDING = 10;

const errorPosition = ref<{ left: number; top: number }>();

const marginAdjustments = ref<Record<string, string>>();

const tooltipRef = ref<HTMLElement>();

function dismiss() {
  props.onDismiss?.();
}

function calculateTooltipPosition(errorMessage: ErrorMessage) {
  const box = errorMessage.targetBox;
  if (!box) return { left: 0, top: 0 };
  const frame = errorMessage.frame;
  const frameBox = frame?.getBoundingClientRect();
  return {
    left: box.left + box.width / 2 - (frameBox?.left ?? 0),
    top: box.top - (frameBox?.top ?? 0),
  };
}

function adjustMargins() {
  const box = tooltipRef.value?.getBoundingClientRect();
  if (!box || !errorPosition.value) {
    marginAdjustments.value = undefined;
    return;
  }

  const left = errorPosition.value.left - box.width / 2;
  const right = errorPosition.value.left + box.width / 2;

  if (left - MIN_PADDING < 0) {
    marginAdjustments.value = {
      marginLeft: `${2 * (MIN_PADDING - left)}px`,
    };
  } else if (right + MIN_PADDING > window.innerWidth) {
    marginAdjustments.value = {
      marginRight: `${2 * (MIN_PADDING + right - window.innerWidth)}px`,
    };
  }
}

watch(
  () => props.errorMessage,
  (errorMessage) => {
    if (errorMessage) {
      errorPosition.value = calculateTooltipPosition(errorMessage);

      window.addEventListener('click', dismiss, { capture: true, once: true });

      nextTick(adjustMargins);
    } else {
      window.removeEventListener('click', dismiss, { capture: true });
    }
  },
  { immediate: true },
);

// CSS v-bind() does not work inside <Teleport>, so CSS variables have to be used directly
const cssVars = computed(() => ({
  '--min-padding': MIN_PADDING,
  '--top': errorPosition.value?.top,
  '--left': errorPosition.value?.left,
}));
</script>

<template>
  <Teleport :to="errorMessage?.frame ?? 'body'">
    <Transition>
      <div v-if="errorMessage" class="error-container" :style="cssVars">
        <div ref="tooltipRef" class="error-tooltip" :style="marginAdjustments">
          <Icon inline>warning</Icon>
          {{ errorMessage.message }}
        </div>
        <div class="tail" />
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
$arrow-height: 8px;

.error-container {
  position: fixed;
  display: flex;
  flex-direction: column;
  transform: translate(-50%, -100%);
  filter: drop-shadow(0 0.5em 1em color-mix(in srgb, var(--color) 50%, transparent));

  align-items: center;

  top: calc(var(--top) * 1px);
  left: calc(var(--left) * 1px);
  z-index: 10;

  &.v-enter-active {
    transition: opacity 0.2s ease;
  }

  &.v-leave-active {
    transition: opacity 0.5s ease;
  }

  &.v-enter-from,
  &.v-leave-to {
    opacity: 0;
  }
}

.error-tooltip {
  background: var(--background-error);
  border-radius: 0.5em;
  padding: 0.5em;
  box-sizing: border-box;

  font-size: 0.9em;
  white-space: pre-line;
  overflow-wrap: break-word;

  max-width: max-content;
  width: min(20em, 100vw - 2 * var(--min-padding) * 1px);
}

.tail {
  background: var(--background-error);
  width: calc(4 * $arrow-height);
  height: $arrow-height;
  // Generated from the line "M0 0h4l4 4l4 -4h4z", with radius 4 curve on the first and third corners, and radius 2 on the second, using npm "svg-round-corners"
  mask: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 4'%3E%3Cpath d='M 0,0 A 0,0,0,0,1,0,0 L 3.172,0 A 2,2,135,0,1,4.586,0.586 L 6.586,2.586 A 2,2,270,0,0,9.414,2.586 L 11.414,0.586 A 2,2,135,0,1,12.828,0 L 16,0 A 0,0,0,0,1,16,0 Z'/%3E%3C/svg%3E");
}
</style>
