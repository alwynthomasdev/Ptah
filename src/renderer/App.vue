<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useSettingsStore } from './stores/settings';
import { useProjectsStore } from './stores/projects';
import { useTicketsStore } from './stores/tickets';
import ProjectPicker from './components/ProjectPicker.vue';
import TicketDialog from './components/TicketDialog.vue';
import TopBar from './components/TopBar.vue';
import ViewTabs from './components/ViewTabs.vue';
import Toolbar from './components/Toolbar.vue';

const settings = useSettingsStore();
const projects = useProjectsStore();
const tickets = useTicketsStore();
const route = useRoute();

const booting = ref(true);
const error = ref<string | null>(null);
const showNew = ref(false);

const views = computed(() => [
  { to: '/board', label: 'Swimlane', count: null as number | null },
  { to: '/list', label: 'List', count: null as number | null },
  { to: '/backlog', label: 'Backlog', count: tickets.statusCounts.backlog as number | null },
  { to: '/archive', label: 'Archive', count: tickets.statusCounts.archive as number | null },
  { to: '/bin', label: 'Recycle bin', count: null as number | null },
  { to: '/settings', label: 'Settings', count: null as number | null },
]);

const CHROME_ROUTES = ['board', 'list', 'backlog', 'archive'];
const hasChrome = computed(() => CHROME_ROUTES.includes(String(route.name)));

const activeLabels = computed(() => tickets.filter.labels ?? []);

function toggleLabel(label: string) {
  const current = activeLabels.value;
  const next = current.includes(label)
    ? current.filter((l) => l !== label)
    : [...current, label];
  tickets.setFilter({ labels: next });
}

async function reloadTickets() {
  // Load every project's tickets; the sidebar / filter bar narrow the view.
  await tickets.load();
}

function scopeToProject(key: string | null) {
  tickets.setFilter({ projects: key ? [key] : undefined });
}

async function boot() {
  try {
    await settings.load();
    await projects.load();
    await reloadTickets();
    scopeToProject(projects.activeKey);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    booting.value = false;
  }
}

onMounted(boot);

async function onProjectChange(key: string | null) {
  projects.setActive(key);
  scopeToProject(key);
}

async function onProjectCreated() {
  await reloadTickets();
  scopeToProject(projects.activeKey);
}
</script>

<template>
  <div class="shell">
    <TopBar />

    <aside class="sidebar scroll-thin">
      <div class="side-section">
        <div class="side-label">PROJECTS</div>
        <ProjectPicker
          :projects="projects.items"
          :active="projects.activeKey"
          @change="onProjectChange"
          @created="onProjectCreated"
        />
      </div>

      <div class="side-section">
        <div class="side-label">VIEWS</div>
        <RouterLink
          v-for="v in views"
          :key="v.to"
          :to="v.to"
          class="side-item"
          active-class="active"
        >
          <span class="name">{{ v.label }}</span>
          <span v-if="v.count !== null" class="count">{{ v.count }}</span>
        </RouterLink>
      </div>

      <div v-if="tickets.labelsInView.length" class="side-section">
        <div class="side-label">FILTER BY LABEL</div>
        <div
          v-for="l in tickets.labelsInView"
          :key="l"
          class="side-item"
          :class="{ active: activeLabels.includes(l) }"
          @click="toggleLabel(l)"
        >
          <span class="name">{{ l }}</span>
        </div>
      </div>
    </aside>

    <main class="main scroll-thin">
      <template v-if="hasChrome">
        <ViewTabs />
        <Toolbar @new="showNew = true" />
      </template>

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
.shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  grid-template-rows: 52px 1fr;
  height: 100%;
}

.sidebar {
  border-right: 1px solid var(--border);
  background: var(--surface);
  padding: 16px 10px;
  overflow-y: auto;
}
.side-section {
  margin-bottom: 20px;
}
.side-label {
  font-size: 10.5px;
  letter-spacing: 0.4px;
  color: var(--text-faint);
  padding: 0 8px 6px;
  font-weight: 600;
}
.side-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 5px;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 13px;
  text-decoration: none;
}
.side-item:hover {
  background: var(--surface-2);
  color: var(--text);
}
.side-item.active {
  background: var(--surface-2);
  color: var(--text);
  font-weight: 600;
}
.side-item.active::before {
  content: '';
  width: 3px;
  height: 14px;
  background: var(--accent);
  border-radius: 2px;
  margin-left: -8px;
  margin-right: 5px;
}
.side-item .name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.side-item .count {
  margin-left: auto;
  color: var(--text-faint);
  font-size: 11px;
  font-family: var(--mono);
}

.main {
  overflow: auto;
  padding: 18px 20px;
}
.pad {
  padding: 24px 0;
}
.error {
  color: var(--danger);
}
</style>
