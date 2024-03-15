<script setup lang="ts">
import { sportTypes } from '@/sportTypes';
import { sportIconString } from '@/utils/icons';

import type StravaSymbolProps from './StravaSymbolProps';

defineProps<StravaSymbolProps>();
</script>

<template>
  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
    <title v-text="sportTypes[sportType]" />
    <path fillRule="evenodd" :d="sportIconString(sportType)" />
  </svg>
</template>
