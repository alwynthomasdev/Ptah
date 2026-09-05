<script setup lang="ts">
import { useProjectsStore } from '../stores/projects';
import ThemeToggle from './ThemeToggle.vue';

const emit = defineEmits<{ new: [] }>();

const projects = useProjectsStore();
</script>

<template>
  <header class="topbar">
    <div class="brand"><span class="mark">P</span> Ptah</div>
    <span class="spacer" />
    <button class="primary btn-new" :disabled="!projects.items.length" @click="emit('new')">
      + New ticket
    </button>
    <ThemeToggle />
  </header>
</template>

<style scoped>
.topbar {
  grid-column: 1 / 3;
  display: flex;
  align-items: center;
  gap: 18px;
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
}
</style>
