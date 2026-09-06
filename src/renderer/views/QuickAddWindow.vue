<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ptah } from '../api';
import { useProjectsStore } from '../stores/projects';
import { useSettingsStore } from '../stores/settings';
import QuickAddDialog from '../components/QuickAddDialog.vue';

/**
 * The lone view rendered in the standalone Quick Add window. This window loads
 * the same bundle as the main one, so it has its own fresh Pinia — it must load
 * the projects list itself. `settings.load()` keeps `data-theme` authoritative
 * (theme-boot.js already applied it pre-paint from localStorage).
 */
const route = useRoute();
const projects = useProjectsStore();
const settings = useSettingsStore();

const ready = ref(false);
const projectKey = typeof route.query.project === 'string' ? route.query.project : null;

onMounted(async () => {
  await Promise.all([projects.load(), settings.load()]);
  ready.value = true;
});

function close() {
  void ptah.window.closeQuickAdd();
}
</script>

<template>
  <div class="quick-add-window">
    <!-- No @created handler: the main window refreshes via the tickets:changed
         broadcast; this window has no list of its own. -->
    <QuickAddDialog v-if="ready" embedded :project-key="projectKey" @close="close" />
  </div>
</template>

<style scoped>
.quick-add-window {
  height: 100%;
}
</style>
