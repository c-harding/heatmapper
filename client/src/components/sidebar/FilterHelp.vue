<script setup lang="ts">
import { useActivityService } from '@/services/useActivityService';
import { type FilterField } from '@/types/FilterModel';

import UIIcon from '../ui/UIIcon.vue';
import UIModal from '../ui/UIModal.vue';

const showHelp = defineModel<boolean>({ default: true });

const appName = import.meta.env.VITE_APP_NAME as string;
const { useRoutes, filterModel, filterFields } = useActivityService();

function toggleFilter(field: FilterField) {
  filterFields.delete(field) || filterFields.add(field);
}
</script>

<template>
  <UIModal v-model="showHelp" heading="Filters" :class="$style.helpModal">
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
            :checked="filterFields.has('sportType')"
            @change="toggleFilter('sportType')"
          />
        </label>
      </dt>
      <dd>
        Filtering by sport type, e.g. whether the {{ useRoutes ? 'route' : 'activity' }} is a hike
        or a run.
      </dd>
      <dd>
        The option <em>All sports</em> means all {{ useRoutes ? 'routes' : 'activities' }},
        regardless of type. The options such as <em>All biking</em> show multiple sport types at
        once.
      </dd>
      <dt>
        <label
          >Distance
          <input
            type="checkbox"
            :checked="filterFields.has('distance')"
            @change="toggleFilter('distance')"
          />
        </label>
      </dt>
      <dt>
        <label
          >Elevation
          <input
            type="checkbox"
            :checked="filterFields.has('elevation')"
            @change="toggleFilter('elevation')"
          />
        </label>
      </dt>
      <dd>
        Show only the {{ useRoutes ? 'routes' : 'activities' }} with a distance/elevation greater
        than or equal to the min value, and less than or equal to the max value. Leave a field blank
        to avoid filtering.
      </dd>
      <dt v-if="useRoutes">
        <label>
          Starred
          <input
            type="checkbox"
            :checked="filterFields.has('starred')"
            @change="toggleFilter('starred')"
          />
        </label>
      </dt>
      <dd v-if="useRoutes">
        Show only routes that you have starred in Strava. Double-click on the button to invert the
        filter, i.e. to show only non-starred routes.
      </dd>
      <dt v-if="!useRoutes">
        <label>
          Gear
          <input
            type="checkbox"
            :checked="filterFields.has('gear')"
            @change="toggleFilter('gear')"
          />
        </label>
      </dt>
      <dd v-if="!useRoutes">
        Show only the activities recorded with the chosen gear (shoes/bike).
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
