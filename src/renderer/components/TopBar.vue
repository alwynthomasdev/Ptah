<script setup lang="ts">
import { ref } from 'vue';
import { useProjectsStore } from '../stores/projects';
import { useNotebooksStore } from '../stores/notebooks';
import GlobalSearch from './GlobalSearch.vue';
import ThemeToggle from './ThemeToggle.vue';

const emit = defineEmits<{
  new: [];
  'quick-add': [];
  'new-note': [];
  'quick-note': [];
}>();

const projects = useProjectsStore();
const notebooks = useNotebooksStore();

const searchEl = ref<InstanceType<typeof GlobalSearch> | null>(null);
defineExpose({ focusSearch: () => searchEl.value?.focus() });
</script>

<template>
  <header class="topbar">
    <div class="brand"><span class="mark">P</span> Ptah</div>
    <GlobalSearch ref="searchEl" />
    <span class="spacer" />
    <button
      class="primary btn-new"
      :disabled="!projects.items.length"
      @click="emit('quick-add')"
    >
      Quick ticket
    </button>
    <button
      class="primary btn-new"
      :disabled="!notebooks.items.length"
      @click="emit('quick-note')"
    >
      Quick note
    </button>
    <button class="ghost btn-new" :disabled="!projects.items.length" @click="emit('new')">
      + New ticket
    </button>
    <button class="ghost btn-new" :disabled="!notebooks.items.length" @click="emit('new-note')">
      + New note
    </button>
    <ThemeToggle />
  </header>
</template>

<style scoped>
.topbar {
  grid-column: 1 / 3;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  letter-spacing: 0.2px;
  flex-shrink: 0;
}
.mark {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: var(--accent);
  color: var(--accent-contrast);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
}
.btn-new {
  font-size: 12.5px;
  padding: 6px 12px;
  flex-shrink: 0;
}
</style>
