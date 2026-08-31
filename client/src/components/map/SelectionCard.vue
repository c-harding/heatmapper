<script setup lang="ts">
import { type MapItem } from '@strava-heatmapper/shared/interfaces';
import { computed } from 'vue';

import { useSelectionStore } from '@/stores/SelectionStore';
import { combineStats } from '@/utils/stats';

import MapItemRow from '../map-item/MapItemRow.vue';
import SidebarItemCount from '../sidebar/SidebarItemCount.vue';
import SidebarItemStats from '../sidebar/SidebarItemStats.vue';
import UIIcon from '../ui/UIIcon.vue';

const selectionStore = useSelectionStore();

// The card is never unmounted, so clearing the selection would empty it before it has left the
// screen. Holding the last one there was gives it something to fade out of.
const frozen = computed<readonly MapItem[]>((previous) =>
  selectionStore.selectedItems.length ? selectionStore.selectedItems : (previous ?? []),
);

const singleItem = computed(() => (frozen.value.length === 1 ? frozen.value[0] : undefined));

// Passed twice so that showSelected is set, which is what names the count "3 activities selected"
const totals = computed(() => combineStats(frozen.value, frozen.value));

const emit = defineEmits<{
  unfold: [];
}>();
</script>

<template>
  <div :class="$style.selectionCard" @click="emit('unfold')">
    <MapItemRow v-if="singleItem" :class="$style.content" :item="singleItem" />
    <div v-else :class="[$style.content, $style.totals]">
      <SidebarItemCount :counts="totals" />
      <SidebarItemStats :item="totals" />
    </div>
    <button
      type="button"
      :class="$style.clear"
      aria-label="Clear selection"
      @click.stop="selectionStore.clearSelection()"
    >
      <UIIcon icon="close" />
    </button>
  </div>
</template>

<style module lang="scss">
.selectionCard {
  // The stack it sits in does not take pointer events, so this has to ask for them
  pointer-events: auto;
  cursor: pointer;

  --row-inline-padding: 8px;

  display: flex;
  align-items: center;
  gap: 4px;
  padding-inline: var(--row-inline-padding);

  background-color: var(--background-full);
  color: var(--color-full);
  border-radius: var(--surface-border-radius);
  box-shadow: 0 2px 14px -4px rgb(0 0 0 / 55%);

  .content {
    flex: 1;
    min-width: 0;
    // A card stands on its own, where a row in the list has neighbours to be separated from.
    // Set through the row’s own variable, so the link’s hit target still reaches its edges.
    // Any larger and the row outgrows its 36px minimum instead of resting on it.
    --row-block-padding: 0.2rem;

    // Compensate for the visual spacing around the ✕ on the right by adding more on the left
    margin-inline-start: 4px;
  }

  .totals {
    // The row takes the same padding from this variable, and sizes its minimum the same way
    box-sizing: border-box;
    padding-block: var(--row-block-padding);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25em;
    font-size: 14px;
    min-height: 36px;
  }

  .clear {
    // The padding is the hit area; the offset keeps the cross where it is drawn
    $padding: 10px; // as UIModal, where a 24px glyph plus twice this is 44px

    all: unset;
    padding-block: $padding;
    padding-inline-end: $padding;
    margin-block: -$padding;
    margin-inline-end: -$padding;
    display: flex;
    cursor: pointer;
    color: var(--color-strong);

    &:hover {
      color: var(--bold-color);
    }
  }
}
</style>
