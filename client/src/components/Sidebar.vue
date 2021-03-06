<template>
  <div class="sidebar" :class="{ minimised }">
    <div class="top-box">
      <div class="header">
        <svg viewBox="0 0 110 36">
          <text x="55" text-anchor="middle" font-weight="bold">
            <tspan x="55" y="13">Strava</tspan>
            <tspan x="55" dy="18">Heatmapper</tspan>
          </text>
        </svg>
      </div>
    </div>
    <div class="minimised-message map">
      <p><Icon>map</Icon></p>
      <p>Map</p>
    </div>
    <div class="minimised-message">
      <p><Icon>arrow_back</Icon></p>
      <p>Back</p>
    </div>
    <div class="scrollable">
      <FormComponent
        ref="form"
        @clear-activities="$emit('clear-activities')"
        @add-activities="$emit('add-activities', $event)"
        @add-activity-maps="$emit('add-activity-maps', $event)"
      />
      <ul>
        <ActivityItem
          v-for="activity of activities"
          :key="activity.id"
          :activity="activity"
          :selected="selected.includes(activity.id)"
          @touchstart="isTouchScreen = true"
          @click="click(activity.id, $event)"
          @dblclick="forceSelect"
        />
      </ul>
    </div>

    <div class="overlay" @click="minimised = !minimised" @wheel="minimised = true" />
  </div>
</template>

<script lang="ts">
import type Activity from '@strava-heatmapper/shared/interfaces/Activity';
import { Component, Emit, Prop, Ref, Vue, Watch } from 'vue-property-decorator';

import ActivityItem from './ActivityItem.vue';
import FormComponent from './Form.vue';
import Icon from './Icon.vue';

function findLastIndex<T>(xs: T[], p: (x: T) => boolean): number {
  for (let i = xs.length - 1; i >= 0; i -= 1) {
    if (p(xs[i])) return i;
  }
  return -1;
}

function getRange(activities: Activity[], to: number, from?: number | number[]): number[] {
  if (to === undefined) return [];
  if (from === undefined) return [to];
  const fromArray: number[] = [from].flat();
  if (fromArray.includes(to)) return fromArray;

  const start = activities.findIndex(({ id }) => to === id || fromArray.includes(id));
  if (start === -1) return [to, ...fromArray];
  const end = findLastIndex(activities, ({ id }) => to === id || fromArray.includes(id));
  return activities.slice(start, end + 1).map(({ id }) => id);
}

function cancelTextSelection() {
  if (window.getSelection) {
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();
  }
}

@Component({
  components: { FormComponent, ActivityItem, Icon },
})
export default class Sidebar extends Vue {
  @Prop({ default: () => [] }) activities!: Activity[];

  @Prop({ default: () => [] }) selected!: number[];

  @Ref() form!: Vue & { loadFromCache(): void };

  localSelected?: number[] = undefined;

  selectionBase?: number[] = undefined;

  minimised = false;

  isTouchScreen = false;

  private toggleInArray<T>(array: T[], item: T): T[] {
    if (array.includes(item)) return array.filter((x) => x !== item);
    else return [...array, item];
  }

  getSelection(id: number, e: MouseEvent): number[] {
    if (e.metaKey || e.ctrlKey) return this.toggleInArray(this.selected, id);
    if (e.shiftKey) return getRange(this.activities, id, this.selectionBase);
    return [id];
  }

  click(id: number, e: MouseEvent): void {
    if (e.detail === 1) this.select(id, e);
  }

  @Emit('update:selected')
  select(id: number, e: MouseEvent): number[] {
    if (e.shiftKey) cancelTextSelection();
    const newSelected = this.getSelection(id, e);
    if (newSelected.length === 1) this.selectionBase = newSelected;
    this.localSelected = newSelected;
    return newSelected;
  }

  @Emit('zoom-to-selected')
  forceSelect(): number[] {
    cancelTextSelection();
    return this.selected;
  }

  @Watch('selected') async onSelected(selected: number[]): Promise<void> {
    if (selected !== this.localSelected) {
      this.localSelected = selected;
      this.selectionBase = selected;
      if (selected.length !== 0) this.minimised = false;
      await this.$nextTick();
      const el = this.$el.querySelector('.selected');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  mounted(): void {
    if (!this.activities || this.activities.length === 0) {
      this.form.loadFromCache();
    }
  }
}
</script>

<style lang="scss">
$max-sidebar-width: calc(100vw - 6rem);
$sidebar-width: 20rem;
$minimised-width: 5rem;
$max-size-to-minimise: 600px;

.sidebar {
  flex: 0 $sidebar-width;
  max-width: $max-sidebar-width;
  display: flex;
  flex-direction: column;
  color: var(--color);
  background-color: var(--background);
  transition: margin var(--transition-speed);
  z-index: 1;
  position: relative;

  .header {
    margin-left: auto;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5em 0 0;

    transition: margin var(--transition-speed), width var(--transition-speed);

    svg {
      height: $minimised-width;
      fill: var(--color);
      max-height: 100%;
    }
  }

  > .scrollable {
    flex: 1;
    overflow: auto;
    padding: 0 0 1em;
    background-color: var(--background);
    transition: margin var(--transition-speed);

    > ul {
      padding: 0;
      margin: 0;
    }
  }

  .top-box {
    transition: margin var(--transition-speed);
  }
}

.overlay {
  display: none;
  cursor: pointer;
}

.minimised-message {
  height: 5rem;
  background: var(--background);
  width: $minimised-width;
  display: flex;
  margin-bottom: -5rem;
  flex-direction: column;
  justify-content: space-evenly;
  margin-left: auto;
  text-align: center;
  transition: margin var(--transition-speed);

  p {
    margin: 0 1em;
  }

  &.map {
    border-radius: 0 1em 1em 0;
    position: relative;
    z-index: -1;

    &::before,
    &::after {
      position: absolute;
      content: '';
      height: 2em;
      left: 0;
      width: 1em;
      background-color: transparent;
    }
    &::before {
      bottom: 100%;
      box-shadow: 0 1em 0 0 var(--background);
      border-bottom-left-radius: 1em;
    }
    &::after {
      top: 100%;
      box-shadow: 0 -1em 0 0 var(--background);
      border-top-left-radius: 1em;
    }
  }
}

@media screen and (max-width: $max-size-to-minimise) {
  .overlay {
    display: block;
    position: absolute;
    z-index: 2;
    left: 100%;
    top: 0;
    bottom: 0;
    width: 100vw;
  }

  .sidebar {
    $sidebar-overlap-fallback: $minimised-width - $sidebar-width;
    $sidebar-overlap: calc(#{$minimised-width} - min(#{$sidebar-width}, #{$max-sidebar-width}));
    margin-right: $sidebar-overlap-fallback;
    margin-right: $sidebar-overlap;

    &.minimised {
      margin-left: $sidebar-overlap-fallback;
      margin-left: $sidebar-overlap;
      margin-right: 0;

      > .scrollable {
        margin-left: -$minimised-width;
        margin-right: $minimised-width;
      }

      .top-box {
        margin-left: -$minimised-width;
        margin-right: $minimised-width;
      }

      .overlay {
        right: 0;
        left: unset;
      }

      .header {
        width: $minimised-width;
        margin-right: -$minimised-width;
      }
    }

    &:not(.minimised) .minimised-message.map {
      margin-right: -$minimised-width;
    }
  }
}
</style>
