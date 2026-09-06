<script setup lang="ts">
import { ref } from 'vue';
import type { UpdateInfo } from '@shared/ipc';
import { call, ptah } from '../api';

const props = defineProps<{ info: UpdateInfo }>();
const emit = defineEmits<{ close: [] }>();

type Phase = 'prompt' | 'downloading' | 'installing';
const phase = ref<Phase>('prompt');
const error = ref<string | null>(null);
const busy = () => phase.value !== 'prompt';

/** electron-updater hands us GitHub's release-notes HTML; show it as plain text. */
const notes = (props.info.releaseNotes ?? '')
  .replace(/<[^>]+>/g, '')
  .replace(/\s+\n/g, '\n')
  .trim();

async function install() {
  error.value = null;
  phase.value = 'downloading';
  try {
    await call(ptah.updates.download());
    phase.value = 'installing';
    await call(ptah.updates.install());
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    phase.value = 'prompt';
  }
}
</script>

<template>
  <div class="backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
    <div class="card dialog">
      <header class="row">
        <h3>Update available</h3>
        <span class="spacer" />
        <button class="ghost" @click="emit('close')">✕</button>
      </header>

      <p class="lead">
        Ptah <strong>v{{ info.version }}</strong> is available. Do you want to install it now?
      </p>

      <pre v-if="notes" class="notes scroll-thin">{{ notes }}</pre>

      <p v-if="phase === 'downloading'" class="muted small">Downloading update…</p>
      <p v-else-if="phase === 'installing'" class="muted small">Restarting to install…</p>
      <p v-if="error" class="err small">{{ error }}</p>

      <footer class="row">
        <span class="spacer" />
        <button type="button" class="ghost" :disabled="busy()" @click="emit('close')">Later</button>
        <button type="button" class="primary" :disabled="busy()" @click="install">
          {{ phase === 'prompt' ? 'Install now' : 'Working…' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: grid;
  place-items: center;
  z-index: var(--z-overlay);
}
.dialog {
  width: min(460px, 92vw);
  max-height: 90vh;
  overflow: auto;
  padding: 16px 20px 20px;
  border-radius: var(--radius-lg);
}
h3 {
  margin: 4px 0;
}
.lead {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--text-dim);
}
.notes {
  margin: 12px 0 0;
  padding: 10px 12px;
  max-height: 180px;
  overflow: auto;
  background: var(--surface-2);
  border-radius: var(--radius);
  font-family: var(--mono);
  font-size: 12px;
  white-space: pre-wrap;
  color: var(--text-dim);
}
.small {
  font-size: 12px;
}
.err {
  color: var(--danger);
  margin: 8px 0 0;
}
footer {
  margin-top: 16px;
}
</style>
