<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ptah } from '../api';
import { useNotebooksStore } from '../stores/notebooks';
import { useSettingsStore } from '../stores/settings';
import QuickNoteDialog from '../components/QuickNoteDialog.vue';

/**
 * The lone view rendered in the standalone Quick Note window. Loads the same
 * bundle as the main window, so it has its own fresh Pinia — it must load the
 * notebooks list itself. `settings.load()` keeps `data-theme` authoritative.
 */
const route = useRoute();
const notebooks = useNotebooksStore();
const settings = useSettingsStore();

const ready = ref(false);
const notebookKey = typeof route.query.notebook === 'string' ? route.query.notebook : null;

onMounted(async () => {
  await Promise.all([notebooks.load(), settings.load()]);
  ready.value = true;
});

function close() {
  void ptah.window.closeQuickNote();
}
</script>

<template>
  <div class="quick-note-window">
    <!-- No @created handler: the main window refreshes via the notes:changed
         broadcast; this window has no list of its own. -->
    <QuickNoteDialog v-if="ready" embedded :notebook-key="notebookKey" @close="close" />
  </div>
</template>

<style scoped>
.quick-note-window {
  height: 100%;
}
</style>
