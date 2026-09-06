<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import type { UpdateInfo } from '@shared/ipc';
import { call, ptah } from './api';
import { useSettingsStore } from './stores/settings';
import { useProjectsStore } from './stores/projects';
import { useTicketsStore } from './stores/tickets';
import ProjectPicker from './components/ProjectPicker.vue';
import TicketDialog from './components/TicketDialog.vue';
import TopBar from './components/TopBar.vue';
import UpdateDialog from './components/UpdateDialog.vue';
import ViewTabs from './components/ViewTabs.vue';
import Toolbar from './components/Toolbar.vue';

const settings = useSettingsStore();
const projects = useProjectsStore();
const tickets = useTicketsStore();
const route = useRoute();
const router = useRouter();

const booting = ref(true);
const error = ref<string | null>(null);
const showNew = ref(false);
const updateInfo = ref<UpdateInfo | null>(null);

/** This bundle also backs the standalone Quick Add window (route `/quick-add`),
 *  which renders only its own view — no shell, no boot side-effects. The hash
 *  check covers first mount, before the router's initial navigation resolves. */
const isPopup = computed(
  () => route.name === 'quick-add' || window.location.hash.startsWith('#/quick-add'),
);

const CHROME_ROUTES = ['board', 'list', 'backlog', 'archive'];
const hasChrome = computed(() => CHROME_ROUTES.includes(String(route.name)));

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

onMounted(() => {
  if (!isPopup.value) void boot();
});

/**
 * Fire-and-forget update check on launch. Resolves `null` when already current
 * or on macOS (unsigned builds can't self-update); rejects in dev / when
 * offline — both are swallowed so startup stays quiet.
 */
async function checkForUpdate() {
  try {
    updateInfo.value = await call(ptah.updates.check());
  } catch {
    /* no update prompt on check failure */
  }
}
onMounted(() => {
  if (!isPopup.value) void checkForUpdate();
});

/** Open (or focus) the standalone Quick Add window, preselecting the active project. */
function openQuickAdd() {
  if (!projects.items.length) return;
  void ptah.window.openQuickAdd(projects.activeKey ?? undefined);
}

/** Global Ctrl/Cmd+N → open the Quick Add window from any view. */
function onKeydown(e: KeyboardEvent) {
  if (e.altKey || e.shiftKey || !(e.ctrlKey || e.metaKey)) return;
  if (e.key.toLowerCase() !== 'n') return;
  if (!projects.items.length) return;
  e.preventDefault();
  openQuickAdd();
}

let unsubTicketsChanged: (() => void) | null = null;
onMounted(() => {
  if (isPopup.value) return;
  window.addEventListener('keydown', onKeydown);
  // Another window (the Quick Add popup) created a ticket — refresh our lists.
  unsubTicketsChanged = ptah.events.onTicketsChanged(() => void reloadTickets());
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  unsubTicketsChanged?.();
});

async function onProjectChange(key: string | null) {
  projects.setActive(key);
  scopeToProject(key);
  router.push('/board');
}

async function onProjectCreated() {
  await reloadTickets();
  scopeToProject(projects.activeKey);
}
</script>

<template>
  <RouterView v-if="isPopup" />

  <div v-else class="shell">
    <TopBar @new="showNew = true" @quick-add="openQuickAdd" />

    <aside class="sidebar scroll-thin">
      <RouterLink to="/today" class="side-item today-item" active-class="active">
        <span class="name">Today</span>
        <span
          v-if="tickets.dueToday.length"
          class="count"
          :class="{ warn: tickets.dueTodayOverdueCount > 0 }"
          >{{ tickets.dueToday.length }}</span
        >
      </RouterLink>

      <div class="side-section">
        <div class="side-label">PROJECTS</div>
        <ProjectPicker
          :projects="projects.orderedItems"
          :active="projects.activeKey"
          @change="onProjectChange"
          @created="onProjectCreated"
        />
      </div>

      <RouterLink to="/search" class="side-item" active-class="active">
        <span class="name">Search</span>
      </RouterLink>
      <RouterLink to="/settings" class="side-item" active-class="active">
        <span class="name">Settings</span>
      </RouterLink>
      <RouterLink to="/bin" class="side-item" active-class="active">
        <span class="name">Recycle bin</span>
      </RouterLink>
    </aside>

    <main class="main scroll-thin">
      <template v-if="hasChrome">
        <ViewTabs />
        <Toolbar />
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
      :project-key="projects.activeKey"
      @close="showNew = false"
      @saved="
        showNew = false;
        reloadTickets();
      "
    />

    <UpdateDialog v-if="updateInfo" :info="updateInfo" @close="updateInfo = null" />
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
.side-item .count.warn {
  color: var(--p-highest);
  font-weight: 600;
}
.today-item {
  margin-bottom: 16px;
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
