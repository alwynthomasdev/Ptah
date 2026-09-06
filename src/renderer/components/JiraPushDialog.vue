<script setup lang="ts">
/**
 * Pick a Jira project + issue type, then create a Jira issue from this ticket
 * (title, description, priority). On success the new issue's browse URL is
 * appended to the ticket's `urls` by the main process. One-way; no status.
 */
import { computed, onMounted, ref, watch } from 'vue';
import type { Ticket, Priority } from '@models/Ticket';
import { PRIORITY_LABELS } from '@models/Ticket';
import type { JiraIssueType, JiraProject, JiraPushResult } from '@shared/ipc';
import { useJiraStore } from '../stores/jira';

const props = defineProps<{ ticket: Ticket }>();
const emit = defineEmits<{ close: []; pushed: [result: JiraPushResult] }>();

const jira = useJiraStore();

/** Mirrors PTAH_TO_JIRA_PRIORITY in src/jira/mapping.ts (kept here to avoid a
 *  renderer dependency on the main-side jira layer). */
const JIRA_PRIORITY: Record<Priority, string> = {
  lowest: 'Lowest',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  highest: 'Highest',
};

const notConfigured = ref(false);
const projects = ref<JiraProject[]>([]);
const issueTypes = ref<JiraIssueType[]>([]);
const projectId = ref('');
const issueTypeId = ref('');
const query = ref('');
const loadingProjects = ref(false);
const loadingTypes = ref(false);
const pushing = ref(false);
const error = ref<string | null>(null);

const existingLink = computed(() => {
  const base = jira.baseUrl.replace(/\/+$/, '');
  if (!base) return undefined;
  return props.ticket.urls.find((u) => u.startsWith(`${base}/browse/`));
});

const jiraPriority = computed(() => JIRA_PRIORITY[props.ticket.priority]);
const descPreview = computed(() => {
  const d = props.ticket.description.trim();
  return d.length > 240 ? `${d.slice(0, 240)}…` : d || '(none)';
});

async function loadProjects() {
  loadingProjects.value = true;
  error.value = null;
  try {
    projects.value = await jira.listProjects(query.value.trim() || undefined);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loadingProjects.value = false;
  }
}

let queryTimer: ReturnType<typeof setTimeout> | undefined;
watch(query, () => {
  clearTimeout(queryTimer);
  queryTimer = setTimeout(loadProjects, 300);
});

async function onProjectChange() {
  issueTypes.value = [];
  issueTypeId.value = '';
  if (!projectId.value) return;
  loadingTypes.value = true;
  error.value = null;
  try {
    issueTypes.value = await jira.listIssueTypes(projectId.value);
    const preferred =
      issueTypes.value.find((t) => t.name.toLowerCase() === 'task') ?? issueTypes.value[0];
    if (preferred) issueTypeId.value = preferred.id;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loadingTypes.value = false;
  }
}

async function submit() {
  if (!projectId.value || !issueTypeId.value) return;
  pushing.value = true;
  error.value = null;
  try {
    const result = await jira.push(props.ticket.id, {
      projectId: projectId.value,
      issueTypeId: issueTypeId.value,
    });
    emit('pushed', result);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    pushing.value = false;
  }
}

onMounted(async () => {
  if (!jira.loaded) {
    try {
      await jira.load();
    } catch {
      /* handled by the configured check below */
    }
  }
  if (!jira.configured) {
    notConfigured.value = true;
    return;
  }
  await loadProjects();
});
</script>

<template>
  <div class="backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
    <div class="card dialog">
      <header class="row">
        <h3>Push {{ ticket.id }} to Jira</h3>
        <span class="spacer" />
        <button class="ghost" @click="emit('close')">✕</button>
      </header>

      <div v-if="notConfigured" class="body">
        <p class="muted">
          Jira isn't connected yet. Add your Jira Cloud base URL, account email, and API token in
          <strong>Settings → Jira integration</strong>, then try again.
        </p>
        <footer class="row">
          <span class="spacer" />
          <button class="ghost" @click="emit('close')">Close</button>
        </footer>
      </div>

      <div v-else class="body">
        <p v-if="existingLink" class="warn small">
          This ticket already links a Jira issue ({{ existingLink }}). Pushing again creates a new,
          separate issue.
        </p>

        <label>
          Find project
          <input v-model="query" type="text" placeholder="Filter by name or key" />
        </label>

        <label>
          Jira project
          <select v-model="projectId" :disabled="loadingProjects" @change="onProjectChange">
            <option value="" disabled>
              {{ loadingProjects ? 'Loading…' : 'Select a project' }}
            </option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }} ({{ p.key }})</option>
          </select>
        </label>

        <label>
          Issue type
          <select v-model="issueTypeId" :disabled="!projectId || loadingTypes">
            <option value="" disabled>
              {{ loadingTypes ? 'Loading…' : !projectId ? 'Pick a project first' : 'Select a type' }}
            </option>
            <option v-for="t in issueTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </label>

        <div class="preview">
          <span class="section-label">Will send</span>
          <dl>
            <dt>Summary</dt>
            <dd>{{ ticket.title }}</dd>
            <dt>Priority</dt>
            <dd>{{ PRIORITY_LABELS[ticket.priority] }} → Jira “{{ jiraPriority }}”</dd>
            <dt>Description</dt>
            <dd class="desc">{{ descPreview }}</dd>
          </dl>
        </div>

        <p v-if="error" class="err">{{ error }}</p>

        <footer class="row">
          <span class="spacer" />
          <button type="button" class="ghost" @click="emit('close')">Cancel</button>
          <button
            type="button"
            class="primary"
            :disabled="pushing || !projectId || !issueTypeId"
            @click="submit"
          >
            {{ pushing ? 'Pushing…' : 'Push to Jira' }}
          </button>
        </footer>
      </div>
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
.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--text-dim);
}
label select,
label input {
  color: var(--text);
}
.preview dl {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 12px;
  font-size: 12.5px;
}
.preview dt {
  color: var(--text-faint);
  font-weight: 600;
}
.preview dd {
  margin: 0;
  color: var(--text);
}
.preview dd.desc {
  white-space: pre-wrap;
  color: var(--text-dim);
}
.section-label {
  display: block;
  font-size: 10.5px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--text-faint);
  font-weight: 600;
  margin-bottom: 6px;
}
.warn {
  color: var(--text-dim);
  background: var(--surface-2, transparent);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 8px;
  margin: 0;
}
.small {
  font-size: var(--fs-sm);
}
.err {
  color: var(--danger);
  margin: 0;
}
</style>
