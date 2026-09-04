<script setup lang="ts">
import { ref } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { useProjectsStore } from '../stores/projects';
import { call, ptah } from '../api';
import ThemeToggle from '../components/ThemeToggle.vue';

const emit = defineEmits<{ changed: [] }>();
const settings = useSettingsStore();
const projects = useProjectsStore();
const busy = ref(false);

const firstKey = projects.activeKey ?? projects.items[0]?.key ?? '';
const exportKey = ref(firstKey);
const importKey = ref(firstKey);
const includeMedia = ref(true);
const ioBusy = ref(false);
const ioMsg = ref<string | null>(null);
const ioErr = ref<string | null>(null);

async function exportProject() {
  if (!exportKey.value) return;
  ioBusy.value = true;
  ioMsg.value = null;
  ioErr.value = null;
  try {
    const done = await call(ptah.io.exportProject(exportKey.value, { media: includeMedia.value }));
    if (done) ioMsg.value = `Exported ${exportKey.value}.`;
  } catch (e) {
    ioErr.value = e instanceof Error ? e.message : String(e);
  } finally {
    ioBusy.value = false;
  }
}

async function importTickets() {
  if (!importKey.value) return;
  ioBusy.value = true;
  ioMsg.value = null;
  ioErr.value = null;
  try {
    const created = await call(ptah.io.import(importKey.value));
    if (created.length) {
      ioMsg.value = `Imported ${created.length} ticket${created.length === 1 ? '' : 's'} into ${importKey.value}.`;
      emit('changed');
    }
  } catch (e) {
    ioErr.value = e instanceof Error ? e.message : String(e);
  } finally {
    ioBusy.value = false;
  }
}

async function changeDataDir() {
  busy.value = true;
  try {
    // On confirm, the main process reloads the window against the new folder —
    // nothing to refresh here. On cancel, pickDataDir resolves null and we just
    // clear the busy flag.
    await settings.pickDataDir();
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
      <ThemeToggle />
    </div>

    <div class="card block">
      <h3>Data folder</h3>
      <p class="muted mono">{{ settings.dataDir }}</p>
      <button :disabled="busy" @click="changeDataDir">Change folder…</button>
      <p class="muted small">
        Tickets are stored here as Markdown files. Choosing a new folder asks you to confirm, then
        reloads Ptah to read from it. Your existing data stays where it is — it is not moved or
        copied.
      </p>
    </div>

    <div class="card block">
      <h3>Import / export</h3>

      <div v-if="projects.items.length === 0" class="muted small">
        Create a project first.
      </div>
      <template v-else>
        <div class="io-row">
          <label class="io-field">
            Export project
            <select v-model="exportKey">
              <option v-for="p in projects.items" :key="p.key" :value="p.key">{{ p.name }}</option>
            </select>
          </label>
          <label class="io-check">
            <input v-model="includeMedia" type="checkbox" />
            Include attachments
          </label>
          <button :disabled="ioBusy || !exportKey" @click="exportProject">Export project…</button>
        </div>

        <div class="io-row">
          <label class="io-field">
            Import into
            <select v-model="importKey">
              <option v-for="p in projects.items" :key="p.key" :value="p.key">{{ p.name }}</option>
            </select>
          </label>
          <button :disabled="ioBusy || !importKey" @click="importTickets">Import tickets…</button>
        </div>

        <p v-if="ioMsg" class="muted small">{{ ioMsg }}</p>
        <p v-if="ioErr" class="err small">{{ ioErr }}</p>
        <p class="muted small">
          A single ticket with no attachments exports as a <code>.md</code> file; otherwise a
          <code>.zip</code>. Import accepts either and always creates new ticket ids.
        </p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 640px;
}
h2 {
  margin: 0 0 4px;
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
  font-size: var(--fs-sm);
}
.err {
  color: var(--danger);
}
.io-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.io-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--text-dim);
}
.io-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-dim);
}
</style>
