<script setup lang="ts">
import { useActivityStore } from '@/stores/ActivityStore';

import UIIcon from '../ui/UIIcon.vue';
import UIModal from '../ui/UIModal.vue';
import helpStyle from './help.module.scss';

const showHelp = defineModel<boolean>({ default: true });

const appName = import.meta.env.VITE_APP_NAME as string;
const activityStore = useActivityStore();
</script>

<template>
  <UIModal v-model="showHelp" heading="Selection" :class="helpStyle.helpModal">
    <p>
      {{ appName }} allows you to select one or more
      {{ activityStore.useRoutes ? 'routes' : 'activities' }}. You can click on
      {{ activityStore.useRoutes ? 'a route' : 'an activity' }} to select it. This will pan the map
      if necessary to ensure it is visible. Double-click to zoom in on the route as much as
      possible.
    </p>
    <p>
      To select multiple {{ activityStore.useRoutes ? 'routes' : 'activities' }}, hold the
      <kbd>Ctrl</kbd> or <kbd>⌘ Command</kbd> key when clicking on each additional
      {{ activityStore.useRoutes ? 'route' : 'activity' }}. To select a range of
      {{ activityStore.useRoutes ? 'routes' : 'activities' }} in the sidebar, hold the
      <kbd>⇧ Shift</kbd> key when clicking.
    </p>
    <p>
      When multiple {{ activityStore.useRoutes ? 'routes' : 'activities' }} are selected, the total
      statistics are shown at the top of the sidebar.
    </p>
    <hr />
    <p>
      Enable multiple selection mode to mimic holding the <kbd>Ctrl</kbd>/<kbd>⌘ Command</kbd> key.
      In this mode, clicking on {{ activityStore.useRoutes ? 'a route' : 'an activity' }} adds it to
      the selection, or removes it if it is already in the selection. When this mode is active, a
      checkbox is shown next to each {{ activityStore.useRoutes ? 'route' : 'activity' }} in the
      sidebar list.
    </p>
    <hr />
    <p>
      The selection can be cleared with the <kbd><UIIcon inline icon="delete" /> Clear</kbd> button.
      It can be focused with the <kbd><UIIcon inline icon="loupe" /> Focus</kbd> button, meaning
      that all unselected {{ activityStore.useRoutes ? 'routes' : 'activities' }} are hidden.
      Clicking on <kbd><UIIcon inline icon="all_out" /> Release</kbd> will undo the last focus,
      unhiding all hidden {{ activityStore.useRoutes ? 'routes' : 'activities' }}.
    </p>
  </UIModal>
</template>
