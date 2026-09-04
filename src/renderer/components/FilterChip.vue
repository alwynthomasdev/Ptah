<script setup lang="ts">
/**
 * A toolbar chip that opens a small popover of checkboxes for a multi-select
 * filter. Emits the full next selection on every toggle.
 */
import { computed, nextTick, ref, watch } from 'vue';

const props = defineProps<{
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  searchable?: boolean;
}>();
const emit = defineEmits<{ 'update:selected': [value: string[]] }>();

const open = ref(false);
const search = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

const visibleOptions = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return props.options;
  return props.options.filter((o) => o.label.toLowerCase().includes(q));
});

watch(open, (isOpen) => {
  if (isOpen && props.searchable) {
    nextTick(() => searchInput.value?.focus());
  } else if (!isOpen) {
    search.value = '';
  }
});

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
        <input
          v-if="searchable"
          ref="searchInput"
          v-model="search"
          type="text"
          class="search"
          placeholder="Search…"
        />
        <label v-for="o in visibleOptions" :key="o.value" class="opt">
          <input type="checkbox" :checked="selected.includes(o.value)" @change="toggle(o.value)" />
          <span>{{ o.label }}</span>
        </label>
        <p v-if="visibleOptions.length === 0" class="opt none">Nothing to filter</p>
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
  border-radius: var(--radius);
  color: var(--text-dim);
  font-size: var(--fs-sm);
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
  z-index: var(--z-dropdown);
}
.popover {
  position: absolute;
  z-index: calc(var(--z-dropdown) + 1);
  top: calc(100% + 4px);
  left: 0;
  min-width: 170px;
  max-height: 260px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.search {
  width: 100%;
  padding: 5px 6px;
  margin-bottom: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font-size: var(--fs-sm);
}
.search:focus {
  outline: none;
  border-color: var(--accent);
}
.opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  font-size: var(--fs-sm);
  color: var(--text-dim);
  cursor: pointer;
  border-radius: var(--radius-sm);
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
