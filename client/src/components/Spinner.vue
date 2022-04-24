<script lang="ts" setup>
import { $computed } from 'vue/macros';

var isNumber = (n: number | string): n is number => !isNaN(parseFloat(`${n}`)) && isFinite(+n);

const props = defineProps({
  size: {
    type: [Number, String],
    // either a number (pixel width/height) or 'tiny', 'small',
    // 'medium', 'large', 'huge', 'massive' for common sizes
    default: 32,
  },
  lineSize: {
    type: Number,
    default: 3,
  },
  lineBgColor: {
    type: String,
    default: '#eee',
  },
  lineFgColor: {
    type: String,
    default: '#2196f3', // match .blue color to Material Design's 'Blue 500' color
  },
  speed: {
    type: Number,
    default: 0.8,
  },
  spacing: {
    type: Number,
    default: 4,
  },
  message: {
    type: String,
    default: '',
  },
  fontSize: {
    type: Number,
    default: 13,
  },
  textFgColor: {
    type: String,
    default: '#555',
  },
});

const sizePx = $computed(() => {
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

const lineSizePx = $computed(() => {
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

const textMarginTop = $computed(() => {
  switch (props.size) {
    case 'tiny':
    case 'small':
    case 'medium':
    case 'large':
    case 'big':
    case 'huge':
    case 'massive':
      return Math.min(Math.max(Math.ceil(sizePx / 8), 3), 12);
  }
  return isNumber(props.spacing) ? props.spacing : 4;
});
const textFontSize = $computed(() => {
  switch (props.size) {
    case 'tiny':
    case 'small':
    case 'medium':
    case 'large':
    case 'big':
    case 'huge':
    case 'massive':
      return Math.min(Math.max(Math.ceil(sizePx * 0.4), 11), 32);
  }
  return isNumber(props.fontSize) ? props.fontSize : 13;
});
const spinnerStyle = $computed(() => ({
  margin: '0 auto',
  'border-radius': '100%',
  border: lineSizePx + 'px solid ' + props.lineBgColor,
  'border-top': lineSizePx + 'px solid ' + props.lineFgColor,
  width: sizePx + 'px',
  height: sizePx + 'px',
  animation: 'vue-simple-spinner-spin ' + props.speed + 's linear infinite',
}));
const textStyle = $computed(() => ({
  'margin-top': textMarginTop + 'px',
  color: props.textFgColor,
  'font-size': textFontSize + 'px',
  'text-align': 'center' as const,
}));
</script>

<template>
  <div>
    <div class="vue-simple-spinner" :style="spinnerStyle" />
    <div v-if="message.length > 0" class="vue-simple-spinner-text" :style="textStyle">
      {{ message }}
    </div>
  </div>
</template>

<style>
.vue-simple-spinner {
  transition: all 0.3s linear;
}

@keyframes vue-simple-spinner-spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
