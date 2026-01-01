<script setup lang="ts">
import { computed, getCurrentInstance, type InputTypeHTMLAttribute } from 'vue';

const {
  name,
  pickList,
  pickListId: pickListIdProp,
} = defineProps<{
  name?: string;

  pickList?: string[] | ((model: string) => string[]);
  pickListId?: string;
  placeholder?: string;
  disabled?: boolean;
  type?: InputTypeHTMLAttribute;
}>();

const [model, modifiers] = defineModel<string, 'trim' | 'lazy'>({ default: undefined });

const pickListValues = computed(() =>
  typeof pickList === 'function' ? pickList(model.value) : pickList,
);

const uid = getCurrentInstance()?.uid;

const pickListId = computed(() =>
  pickList ? (pickListIdProp ?? `ui-text-field-pick-list-${uid}`) : undefined,
);
</script>

<!-- From https://acdcjunior.github.io/how-bind-date-object-to-input-date-vue.js-v-model.html -->
<template>
  <div :class="$style.textField">
    <input
      ref="input"
      v-model.lazy="model"
      :model-modifiers="modifiers"
      autocomplete="off"
      :name
      :list="pickListId"
      :placeholder
      :disabled
      :type
    />
    <datalist v-if="pickList" :id="pickListId">
      <option v-for="option in pickListValues" :key="option" :value="option" />
    </datalist>
  </div>
</template>

<style module lang="scss">
.textField {
  display: flex;
  margin: 0.5rem;

  border-radius: var(--border-radius);
  border: 1px solid var(--color-weak);
  background-color: var(--background-full);

  min-width: 3em;
  min-height: 1.75rem;
  box-sizing: border-box;

  input {
    flex: 1;
    background-color: inherit;
    border: none;
    min-width: 8rem;
    margin: 0.15rem 0.4rem;
    color: var(--color-full);
    appearance: none;

    &:focus {
      outline: none;
    }
  }
}
</style>
