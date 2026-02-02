<script setup lang="ts">
import { useActivityStore } from '@/stores/ActivityStore';
import { type FilterField } from '@/types/FilterModel';

import UIIcon from '../ui/UIIcon.vue';
import UIModal from '../ui/UIModal.vue';
import helpStyle from './help.module.scss';

const showHelp = defineModel<boolean>({ default: true });

const appName = import.meta.env.VITE_APP_NAME as string;
const activityStore = useActivityStore();

function toggleFilter(field: FilterField) {
  activityStore.filterFields.delete(field) || activityStore.filterFields.add(field);
}
</script>

<template>
  <UIModal v-model="showHelp" heading="Filters" :class="helpStyle.helpModal">
    <p>
      The following filters are available in {{ appName }}. Use the checkboxes to show/hide the
      filters in the filter panel.
    </p>
    <hr />
    <dl>
      <dt>
        <label>
          Sport Type
          <input
            type="checkbox"
            :checked="activityStore.filterFields.has('sportType')"
            @change="toggleFilter('sportType')"
          />
        </label>
      </dt>
      <dd>
        Filtering by sport type, e.g. whether the
        {{ activityStore.useRoutes ? 'route' : 'activity' }} is a hike or a run.
      </dd>
      <dd>
        The option <em>All sports</em> means all
        {{ activityStore.useRoutes ? 'routes' : 'activities' }}, regardless of type. The options
        such as <em>All biking</em> show multiple sport types at once.
      </dd>

      <dt>
        <label
          >Distance
          <input
            type="checkbox"
            :checked="activityStore.filterFields.has('distance')"
            @change="toggleFilter('distance')"
          />
        </label>
      </dt>
      <dt>
        <label
          >Elevation
          <input
            type="checkbox"
            :checked="activityStore.filterFields.has('elevation')"
            @change="toggleFilter('elevation')"
          />
        </label>
      </dt>
      <dd>
        Show only the {{ activityStore.useRoutes ? 'routes' : 'activities' }} with a
        distance/elevation greater than or equal to the min value, and less than or equal to the max
        value. Leave a field blank to avoid filtering.
      </dd>

      <dt v-if="activityStore.useRoutes">
        <label>
          Starred
          <input
            type="checkbox"
            :checked="activityStore.filterFields.has('starred')"
            @change="toggleFilter('starred')"
          />
        </label>
      </dt>

      <dd v-if="activityStore.useRoutes">
        Select <kbd><UIIcon inline icon="star" /></kbd> to show only starred routes, or
        <kbd><UIIcon inline icon="star_border" /></kbd> to show only non-starred routes. Click again
        to disable this filter.
      </dd>

      <dt v-if="!activityStore.useRoutes">
        <label>
          Gear
          <input
            type="checkbox"
            :checked="activityStore.filterFields.has('gear')"
            @change="toggleFilter('gear')"
          />
        </label>
      </dt>
      <dd v-if="!activityStore.useRoutes">
        Show only the activities recorded with the chosen gear (shoes/bike).
      </dd>

      <dt v-if="!activityStore.useRoutes">
        <label
          >Device
          <input
            type="checkbox"
            :checked="activityStore.filterFields.has('device')"
            @change="toggleFilter('device')"
          />
        </label>
      </dt>
      <dd>
        Enter a device name (or part of a name) to show only activities recorded with that device.
        To only match exact names, surround the name with quotation marks, e.g. "Garmin Forerunner
        945".
      </dd>

      <dt v-if="!activityStore.useRoutes">
        <label
          >Commutes
          <input
            type="checkbox"
            :checked="activityStore.filterFields.has('isCommute')"
            @change="toggleFilter('isCommute')"
          />
        </label>
      </dt>
      <dd v-if="!activityStore.useRoutes">
        Select
        <UIIcon inline icon="work" /> to show only commutes, or <UIIcon inline icon="work_off" /> to
        exclude commutes. Click again to disable this filter.
      </dd>

      <dt>
        <label
          >Visibility
          <input
            type="checkbox"
            :checked="activityStore.filterFields.has('isPrivate')"
            @change="toggleFilter('isPrivate')"
          />
        </label>
      </dt>
      <dd>
        Select
        <UIIcon inline icon="lock_open" /> to show only non-private
        {{ activityStore.useRoutes ? 'routes' : 'activities' }}, or <UIIcon inline icon="lock" /> to
        show only private {{ activityStore.useRoutes ? 'routes' : 'activities' }}. Click again to
        disable this filter.
      </dd>
    </dl>
    <hr />
    <p>
      Use the <kbd><UIIcon inline icon="save" /> Save</kbd> button below the filters to save the
      current filter configuration. This will then be used whenever you load {{ appName }}.
    </p>
    <p>
      Use the <kbd><UIIcon inline icon="delete" /> Clear</kbd> button to discard the filter
      configuration, resetting all values to empty. After doing this, an
      <kbd><UIIcon inline icon="undo" /> Undo</kbd> button is shown to undo this change.
    </p>
    <p>
      If a filter configuration has been saved, use the
      <kbd><UIIcon inline icon="settings_backup_restore" /> Reset</kbd> button to reset to the saved
      configuration.
    </p>
  </UIModal>
</template>

<style lang="scss" module>
.helpModal {
  width: min(35em, calc(100vw - 4rem));
  max-height: 90vh;

  dl {
    > dt {
      font-weight: 600;
    }

    > dd {
      margin-left: 1em;
      margin-block: 0.5em;
    }
  }

  kbd {
    font-family: inherit;
    font-weight: bold;
    white-space: nowrap;
  }
}
</style>
