import {
  computed,
  inject,
  type InjectionKey,
  onBeforeUnmount,
  provide,
  reactive,
  type Ref,
  ref,
} from 'vue';

export interface UseExpandableGroups {
  /** Are there one or more groups? */
  hasGroups: Readonly<Ref<boolean>>;
  areAllExpanded: Readonly<Ref<boolean>>;
  setAllExpanded(value: boolean): void;
}

interface ExpandableGroupsService extends UseExpandableGroups {
  /**
   * Create a new group, which is expanded unless all existing groups are collapsed.
   */
  addGroup(): Ref<boolean>;
  removeGroup(ref: Ref<boolean>): void;
}

const expandableGroupsServiceToken: InjectionKey<ExpandableGroupsService> =
  Symbol('ExpandableGroupsService');

function makeExpandableGroups(): ExpandableGroupsService {
  const groups = reactive(new Set<Ref<boolean>>());

  /**
   * Whether to make the next group expanded when there are no groups
   *
   * This is updated when deleting the last group.
   */
  let lastState = false;

  const hasGroups = computed(() => groups.size > 0);
  const areAllExpanded = computed(() =>
    Array.from(groups.values()).every((expanded) => expanded.value),
  );

  return {
    hasGroups,
    areAllExpanded,
    setAllExpanded: (value) =>
      groups.forEach((group) => {
        group.value = value;
      }),
    addGroup: () => {
      const expanded = ref(hasGroups.value ? areAllExpanded.value : lastState);
      groups.add(expanded);
      return expanded;
    },
    removeGroup: (expanded) => {
      groups.delete(expanded);
      if (groups.size === 0) {
        lastState = expanded.value;
      }
    },
  };
}

export function provideExpandableGroups() {
  const service = makeExpandableGroups();
  provide(expandableGroupsServiceToken, service);
  return service;
}

export function useExpandableGroups(): UseExpandableGroups {
  return inject(expandableGroupsServiceToken, provideExpandableGroups, true);
}

export function useExpandableGroup() {
  const service = inject(expandableGroupsServiceToken, provideExpandableGroups, true);

  const expanded = service.addGroup();
  onBeforeUnmount(() => service.removeGroup(expanded));
  return expanded;
}
