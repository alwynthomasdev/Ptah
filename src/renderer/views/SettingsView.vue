<script setup lang="ts">
import { ref } from 'vue';
import type { AppConfig } from '@shared/ipc';
import { useSettingsStore } from '../stores/settings';
import { useProjectsStore } from '../stores/projects';
import { useTicketsStore } from '../stores/tickets';

const emit = defineEmits<{ changed: [] }>();
const settings = useSettingsStore();
const projects = useProjectsStore();
const tickets = useTicketsStore();
const busy = ref(false);

const themes: AppConfig['theme'][] = ['light', 'dark', 'system'];

async function changeDataDir() {
  busy.value = true;
  try {
    const cfg = await settings.pickDataDir();
    if (cfg) {
      await projects.load();
      await tickets.load(projects.activeKey ?? undefined);
      emit('changed');
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="view">
    <h2>Settings</h2>

    <div class="card block">
      <h3>Theme</h3>
      <div class="row">
        <button
          v-for="t in themes"
          :key="t"
          :class="{ primary: settings.theme === t }"
          @click="settings.setTheme(t)"
        >
          {{ t }}
        </button>
      </div>
    </div>

    <div class="card block">
      <h3>Data folder</h3>
      <p class="muted mono">{{ settings.dataDir }}</p>
      <button :disabled="busy" @click="changeDataDir">Change folder…</button>
      <p class="muted small">
        Tickets are stored here as Markdown files. Changing the folder reloads Ptah from the new
        location; it does not move existing data.
      </p>
    </div>
  </section>
</template>

<style scoped>
.view {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 640px;
}
h2 {
  margin: 0;
}
.block {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
h3 {
  margin: 0;
}
.mono {
  font-family: ui-monospace, monospace;
  word-break: break-all;
}
.small {
  font-size: 12px;
}
</style>
