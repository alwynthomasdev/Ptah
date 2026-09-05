<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { ClaudeDetectResult, ClaudeTarget, UpdateInfo } from '@shared/ipc';
import { DEFAULT_PROJECT_KEY } from '@models/Project';
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

const projectsError = ref<string | null>(null);

const defaultProjectNameInput = ref(settings.defaultProjectName);
const defaultProjectNameBusy = ref(false);
const defaultProjectNameErr = ref<string | null>(null);

async function saveDefaultProjectName() {
  const name = defaultProjectNameInput.value.trim();
  if (!name) return;
  defaultProjectNameBusy.value = true;
  defaultProjectNameErr.value = null;
  try {
    await settings.setDefaultProjectName(name);
    defaultProjectNameInput.value = settings.defaultProjectName;
    if (projects.byKey(DEFAULT_PROJECT_KEY)) {
      await projects.rename(DEFAULT_PROJECT_KEY, name);
    } else {
      await projects.load();
    }
  } catch (e) {
    defaultProjectNameErr.value = e instanceof Error ? e.message : String(e);
  } finally {
    defaultProjectNameBusy.value = false;
  }
}

async function deleteProject(p: { key: string; name: string }) {
  if (
    !confirm(
      `Permanently delete project "${p.name}" and all its tickets? This cannot be undone and does not use the recycle bin.`,
    )
  ) {
    return;
  }
  projectsError.value = null;
  try {
    await projects.remove(p.key);
    emit('changed');
  } catch (e) {
    projectsError.value = e instanceof Error ? e.message : String(e);
  }
}

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

const claudeStatus = ref<ClaudeDetectResult | null>(null);
const claudeBusy = ref<Record<ClaudeTarget, boolean>>({ code: false, desktop: false });
const claudeErr = ref<Record<ClaudeTarget, string | null>>({ code: null, desktop: null });

const claudeLabels: Record<ClaudeTarget, string> = { code: 'Claude Code', desktop: 'Claude Desktop' };

async function refreshClaudeStatus() {
  try {
    claudeStatus.value = await call(ptah.claude.detect());
  } catch {
    claudeStatus.value = null;
  }
}

async function toggleClaude(target: ClaudeTarget) {
  const status = claudeStatus.value?.[target];
  if (!status) return;
  claudeBusy.value[target] = true;
  claudeErr.value[target] = null;
  try {
    if (status.connected) {
      await call(ptah.claude.disconnect(target));
    } else {
      await call(ptah.claude.connect(target));
    }
    await refreshClaudeStatus();
  } catch (e) {
    claudeErr.value[target] = e instanceof Error ? e.message : String(e);
  } finally {
    claudeBusy.value[target] = false;
  }
}

onMounted(() => {
  refreshClaudeStatus();
});

const checking = ref(false);
const checkMsg = ref<string | null>(null);
const checkErr = ref<string | null>(null);
const available = ref<UpdateInfo | null>(null);

const downloading = ref(false);
const downloaded = ref(false);
const downloadErr = ref<string | null>(null);

const installing = ref(false);
const installErr = ref<string | null>(null);

async function checkForUpdate() {
  checking.value = true;
  checkMsg.value = null;
  checkErr.value = null;
  available.value = null;
  downloaded.value = false;
  downloadErr.value = null;
  try {
    const info = await call(ptah.updates.check());
    if (info) {
      available.value = info;
      checkMsg.value = `v${info.version} is available`;
    } else {
      checkMsg.value = "You're up to date";
    }
  } catch (e) {
    checkErr.value = e instanceof Error ? e.message : String(e);
  } finally {
    checking.value = false;
  }
}

async function downloadUpdate() {
  downloading.value = true;
  downloadErr.value = null;
  try {
    await call(ptah.updates.download());
    downloaded.value = true;
  } catch (e) {
    downloadErr.value = e instanceof Error ? e.message : String(e);
  } finally {
    downloading.value = false;
  }
}

async function installUpdate() {
  installing.value = true;
  installErr.value = null;
  try {
    await call(ptah.updates.install());
  } catch (e) {
    installErr.value = e instanceof Error ? e.message : String(e);
    installing.value = false;
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
      <h3>Claude integration</h3>

      <ul v-if="claudeStatus" class="claude-list">
        <li v-for="target in (['code', 'desktop'] as ClaudeTarget[])" :key="target" class="claude-row">
          <div class="claude-info">
            <span class="claude-name">{{ claudeLabels[target] }}</span>
            <span class="muted small">
              <template v-if="!claudeStatus[target].installed">Not installed</template>
              <template v-else-if="claudeStatus[target].connected">Connected</template>
              <template v-else>Not connected</template>
            </span>
          </div>
          <button
            type="button"
            :disabled="!claudeStatus[target].installed || claudeBusy[target]"
            @click="toggleClaude(target)"
          >
            {{ claudeBusy[target] ? 'Working…' : claudeStatus[target].connected ? 'Disconnect' : 'Connect' }}
          </button>
        </li>
      </ul>
      <p v-if="claudeStatus && !claudeStatus.code.installed" class="muted small">
        Claude Code isn't installed on this machine.
      </p>
      <p v-if="claudeStatus && !claudeStatus.desktop.installed" class="muted small">
        Claude Desktop isn't installed on this machine.
      </p>
      <p v-if="claudeErr.code" class="err small">Claude Code: {{ claudeErr.code }}</p>
      <p v-if="claudeErr.desktop" class="err small">Claude Desktop: {{ claudeErr.desktop }}</p>

      <p class="muted small">
        Connecting registers Ptah as an MCP server so Claude can read, create, edit, and delete your
        tickets directly. Syncing with other tools (e.g. Jira) is not something Ptah does — Claude can
        do that itself if it has other MCP servers connected. If Ptah's window is open while Claude
        edits a ticket, this window won't automatically refresh yet — switch views or reload to see
        the change.
      </p>
    </div>

    <div class="card block">
      <h3>Default project</h3>
      <p class="muted small">
        Every Ptah install starts with one project (key <code>TODO</code>). Its name is yours to
        set.
      </p>
      <div class="io-row">
        <label class="io-field">
          Name
          <input v-model="defaultProjectNameInput" type="text" />
        </label>
        <button
          :disabled="defaultProjectNameBusy || !defaultProjectNameInput.trim()"
          @click="saveDefaultProjectName"
        >
          {{ defaultProjectNameBusy ? 'Saving…' : 'Save' }}
        </button>
      </div>
      <p v-if="defaultProjectNameErr" class="err small">{{ defaultProjectNameErr }}</p>
    </div>

    <div class="card block">
      <h3>Projects</h3>

      <div v-if="projects.items.length === 0" class="muted small">No projects yet.</div>
      <ul v-else class="project-list">
        <li v-for="p in projects.orderedItems" :key="p.key">
          <span class="proj-name">{{ p.name }}</span>
          <span class="proj-key mono">{{ p.key }}</span>
          <span class="spacer" />
          <button
            type="button"
            class="ghost small danger"
            :disabled="p.key === DEFAULT_PROJECT_KEY"
            :title="p.key === DEFAULT_PROJECT_KEY ? 'The default project cannot be deleted.' : undefined"
            @click="deleteProject(p)"
          >
            Delete
          </button>
        </li>
      </ul>
      <p v-if="projectsError" class="err small">{{ projectsError }}</p>
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
              <option v-for="p in projects.orderedItems" :key="p.key" :value="p.key">{{ p.name }}</option>
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
              <option v-for="p in projects.orderedItems" :key="p.key" :value="p.key">{{ p.name }}</option>
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

    <div class="card block">
      <h3>Software update</h3>

      <div class="update-row">
        <button :disabled="checking" @click="checkForUpdate">
          {{ checking ? 'Checking…' : 'Check for updates' }}
        </button>
        <span v-if="checkMsg" class="muted small">{{ checkMsg }}</span>
      </div>
      <p v-if="checkErr" class="err small">{{ checkErr }}</p>

      <div v-if="available" class="update-row">
        <template v-if="!downloaded">
          <button :disabled="downloading" @click="downloadUpdate">
            {{ downloading ? 'Downloading…' : 'Download' }}
          </button>
        </template>
        <template v-else>
          <button :disabled="installing" @click="installUpdate">
            {{ installing ? 'Restarting…' : 'Restart & Install' }}
          </button>
        </template>
      </div>
      <p v-if="downloadErr" class="err small">{{ downloadErr }}</p>
      <p v-if="installErr" class="err small">{{ installErr }}</p>
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
.update-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.project-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.proj-name {
  color: var(--text);
  font-size: 13px;
}
.proj-key {
  color: var(--text-faint);
  font-size: 11px;
}
.danger {
  color: var(--danger);
}
.claude-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.claude-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.claude-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.claude-name {
  color: var(--text);
  font-size: 13px;
}
</style>
