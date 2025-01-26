<script setup lang="ts">
import { computed } from 'vue';

const isNumber = (n: number | string): n is number => !isNaN(parseFloat(`${n}`)) && isFinite(+n);

type Size = 'tiny' | 'small' | 'medium' | 'large' | 'big' | 'huge' | 'massive';

const sizes: Record<Size | number, Record<'size' | 'lineSize', number>> = {
  tiny: { size: 12, lineSize: 1 },
  small: { size: 16, lineSize: 2 },
  medium: { size: 32, lineSize: 3 },
  large: { size: 48, lineSize: 3 },
  big: { size: 64, lineSize: 4 },
  huge: { size: 96, lineSize: 4 },
  massive: { size: 128, lineSize: 5 },
};

const {
  size = 32,
  lineSize = 3,
  lineBgColor = 'transparent',
  lineFgColor = 'currentColor',
  speed = 0.8,
} = defineProps<{
  size?: number | Size;
  lineSize?: number;
  lineBgColor?: string;
  lineFgColor?: string;
  speed?: number;
}>();

const sizePx = computed(() => {
  if (size in sizes) return sizes[size].size;
  return isNumber(size) ? size : 32;
});

const lineSizePx = computed(() => {
  if (size in sizes) return sizes[size].lineSize;
  return isNumber(lineSize) ? lineSize : 4;
});

const spinnerStyle = computed(() => ({
  width: sizePx.value + 'px',
  height: sizePx.value + 'px',
  maxWidth: sizePx.value + 'px',
  maxHeight: sizePx.value + 'px',
}));
</script>

<template>
  <div class="spinnerContainer">
    <div class="spinner" :style="spinnerStyle" />
    <span><slot /></span>
  </div>
</template>

<style module>
.spinnerContainer {
  display: flex;

  &:has(> :is(.spinner, :not(:empty)) ~ :not(:empty)) {
    gap: 0.5ch;
  }
}

.spinner {
  transition: all 0.3s linear;
  margin: auto;
  border-radius: 100%;
  animation: spinner-spin linear infinite;
  animation-duration: calc(v-bind(speed) * 1s);
  border: calc(v-bind(lineSizePx) * 1px) solid v-bind(lineBgColor);
  border-top-color: v-bind(lineFgColor);
}

@keyframes spinner-spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
