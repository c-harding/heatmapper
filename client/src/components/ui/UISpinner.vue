<script lang="ts" setup>
import { computed, type PropType } from 'vue';

const isNumber = (n: number | string): n is number => !isNaN(parseFloat(`${n}`)) && isFinite(+n);

type Size = 'tiny' | 'small' | 'medium' | 'big' | 'large' | 'huge' | 'massive';

const props = defineProps({
  size: {
    type: [Number, String] as PropType<number | Size>,
    default: 32,
  },
  lineSize: {
    type: Number,
    default: 3,
  },
  lineBgColor: {
    type: String,
    default: 'transparent',
  },
  lineFgColor: {
    type: String,
    default: 'currentColor',
  },
  speed: {
    type: Number,
    default: 0.8,
  },
});

const sizePx = computed(() => {
  switch (props.size) {
    case 'tiny':
      return 12;
    case 'small':
      return 16;
    case 'medium':
      return 32;
    case 'large':
      return 48;
    case 'big':
      return 64;
    case 'huge':
      return 96;
    case 'massive':
      return 128;
  }
  return isNumber(props.size) ? props.size : 32;
});

const lineSizePx = computed(() => {
  switch (props.size) {
    case 'tiny':
      return 1;
    case 'small':
      return 2;
    case 'medium':
      return 3;
    case 'large':
      return 3;
    case 'big':
      return 4;
    case 'huge':
      return 4;
    case 'massive':
      return 5;
  }
  return isNumber(props.lineSize) ? props.lineSize : 4;
});

const spinnerStyle = computed(() => ({
  width: sizePx.value + 'px',
  height: sizePx.value + 'px',
  maxWidth: sizePx.value + 'px',
  maxHeight: sizePx.value + 'px',
}));
</script>

<template>
  <div class="spinner-container">
    <div class="spinner" :style="spinnerStyle" />
  </div>
</template>

<style scoped>
.spinner-container {
  display: flex;
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
