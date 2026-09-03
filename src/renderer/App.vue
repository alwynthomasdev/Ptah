<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useSettingsStore } from './stores/settings';
import { useProjectsStore } from './stores/projects';
import { useTicketsStore } from './stores/tickets';
import ProjectPicker from './components/ProjectPicker.vue';
import TicketDialog from './components/TicketDialog.vue';

const settings = useSettingsStore();
const projects = useProjectsStore();
const tickets = useTicketsStore();
const route = useRoute();

const booting = ref(true);
const error = ref<string | null>(null);
const showNew = ref(false);

const nav = [
  { to: '/board', label: 'Swimlane' },
  { to: '/list', label: 'List' },
  { to: '/backlog', label: 'Backlog' },
  { to: '/archive', label: 'Archive' },
  { to: '/bin', label: 'Recycle Bin' },
  { to: '/settings', label: 'Settings' },
];

async function reloadTickets() {
  await tickets.load(projects.activeKey ?? undefined);
}

async function boot() {
  try {
    await settings.load();
    await projects.load();
    await reloadTickets();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    booting.value = false;
  }
}

onMounted(boot);

async function onProjectChange(key: string | null) {
  projects.setActive(key);
  await reloadTickets();
}
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">Ptah</div>
      <ProjectPicker
        :projects="projects.items"
        :active="projects.activeKey"
        @change="onProjectChange"
        @created="reloadTickets"
      />
      <button class="primary new-btn" :disabled="!projects.activeKey" @click="showNew = true">
        + New ticket
      </button>
      <nav>
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ active: route.path === item.to }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>

    <main class="content">
      <div v-if="booting" class="muted pad">Loading…</div>
      <div v-else-if="error" class="pad">
        <p class="error">{{ error }}</p>
        <button @click="boot">Retry</button>
      </div>
      <RouterView v-else v-slot="{ Component }">
        <component :is="Component" @changed="reloadTickets" />
      </RouterView>
    </main>

    <TicketDialog
      v-if="showNew"
      mode="create"
      :project-key="projects.activeKey"
      @close="showNew = false"
      @saved="
        showNew = false;
        reloadTickets();
      "
    />
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-columns: 232px 1fr;
  height: 100%;
}
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.brand {
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.5px;
}
.new-btn {
  width: 100%;
}
nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
}
.nav-link {
  padding: 7px 10px;
  border-radius: var(--radius);
  color: var(--text);
  text-decoration: none;
}
.nav-link:hover {
  background: var(--surface-2);
}
.nav-link.active {
  background: var(--accent);
  color: var(--accent-contrast);
}
.content {
  overflow: auto;
}
.pad {
  padding: 24px;
}
.error {
  color: var(--danger);
}
</style>
