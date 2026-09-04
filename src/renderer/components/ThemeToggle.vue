<script setup lang="ts">
import type { AppConfig } from '@shared/ipc';
import { useSettingsStore } from '../stores/settings';

const settings = useSettingsStore();

const options: { value: AppConfig['theme']; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];
</script>

<template>
  <div class="theme-toggle">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :class="{ active: settings.theme === o.value }"
      @click="settings.setTheme(o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}
.theme-toggle button {
  border: none;
  border-radius: 0;
  background: var(--surface-2);
  color: var(--text-dim);
  font-size: 11.5px;
  padding: 5px 9px;
  cursor: pointer;
}
.theme-toggle button:hover {
  color: var(--text);
}
.theme-toggle button.active {
  background: var(--accent);
  color: var(--accent-contrast);
  font-weight: 600;
}
.theme-toggle button + button {
  border-left: 1px solid var(--border);
}
</style>
