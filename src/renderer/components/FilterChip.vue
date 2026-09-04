<script setup lang="ts">
/**
 * A toolbar chip that opens a small popover of checkboxes for a multi-select
 * filter. Emits the full next selection on every toggle.
 */
import { ref } from 'vue';

const props = defineProps<{
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
}>();
const emit = defineEmits<{ 'update:selected': [value: string[]] }>();

const open = ref(false);

function toggle(value: string) {
  const next = props.selected.includes(value)
    ? props.selected.filter((v) => v !== value)
    : [...props.selected, value];
  emit('update:selected', next);
}
</script>

<template>
  <div class="filter-chip">
    <button type="button" class="chip" :class="{ on: selected.length }" @click="open = !open">
      <span>{{ label }}<template v-if="selected.length"> · {{ selected.length }}</template></span>
      <span class="caret">▾</span>
    </button>

    <template v-if="open">
      <div class="chip-backdrop" @click="open = false" />
      <div class="popover">
        <label v-for="o in options" :key="o.value" class="opt">
          <input type="checkbox" :checked="selected.includes(o.value)" @change="toggle(o.value)" />
          <span>{{ o.label }}</span>
        </label>
        <p v-if="options.length === 0" class="opt none">Nothing to filter</p>
        <button v-if="selected.length" type="button" class="clear" @click="emit('update:selected', [])">
          Clear
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.filter-chip {
  position: relative;
}
.chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-dim);
  font-size: 12px;
  background: var(--surface);
  cursor: pointer;
}
.chip:hover {
  border-color: var(--text-faint);
  color: var(--text);
}
.chip.on {
  border-color: var(--accent);
  color: var(--text);
}
.caret {
  font-size: 9px;
  color: var(--text-faint);
}
.chip-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.popover {
  position: absolute;
  z-index: 41;
  top: calc(100% + 4px);
  left: 0;
  min-width: 170px;
  max-height: 260px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  font-size: 12px;
  color: var(--text-dim);
  cursor: pointer;
  border-radius: 4px;
}
.opt:hover {
  background: var(--surface-2);
  color: var(--text);
}
.opt input {
  margin: 0;
}
.opt.none {
  color: var(--text-faint);
  cursor: default;
}
.opt.none:hover {
  background: transparent;
}
.clear {
  margin-top: 4px;
  font-size: 11px;
  padding: 4px 6px;
}
</style>
