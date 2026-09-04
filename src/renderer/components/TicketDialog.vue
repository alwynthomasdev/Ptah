<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { Ticket } from '@models/Ticket';
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from '@models/Ticket';
import { fromDateInput, toDateInput } from '@shared/dates';
import { useTicketsStore } from '../stores/tickets';
import { call, ptah } from '../api';
import MarkdownEditor from './MarkdownEditor.vue';
import AttachmentList from './AttachmentList.vue';

const props = defineProps<{
  mode: 'create' | 'edit';
  projectKey?: string | null;
  ticket?: Ticket | null;
}>();
const emit = defineEmits<{ close: []; saved: [ticket: Ticket] }>();

const tickets = useTicketsStore();
const error = ref<string | null>(null);
const saving = ref(false);

/** Local copy that tracks out-of-band changes (attachments) while the form edits. */
const current = ref<Ticket | null>(props.ticket ?? null);

function onAttachmentsUpdated(t: Ticket) {
  current.value = t;
  tickets.upsert(t);
}

async function exportTicket() {
  if (!current.value) return;
  error.value = null;
  try {
    await call(ptah.io.exportTicket(current.value.id));
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

const form = reactive({
  title: props.ticket?.title ?? '',
  status: props.ticket?.status ?? 'backlog',
  priority: props.ticket?.priority ?? 'medium',
  due: toDateInput(props.ticket?.due),
  labels: (props.ticket?.labels ?? []).join(', '),
  description: props.ticket?.description ?? '',
});

const heading = computed(() =>
  props.mode === 'create' ? `New ticket in ${props.projectKey}` : `Edit ${props.ticket?.id}`,
);

function parseLabels(): string[] {
  return form.labels
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function submit() {
  error.value = null;
  saving.value = true;
  try {
    let result: Ticket;
    if (props.mode === 'create') {
      if (!props.projectKey) throw new Error('Pick a project first.');
      result = await tickets.create({
        title: form.title,
        project: props.projectKey,
        status: form.status,
        priority: form.priority,
        due: fromDateInput(form.due),
        labels: parseLabels(),
        description: form.description,
      });
    } else {
      result = await tickets.update(props.ticket!.id, {
        title: form.title,
        status: form.status,
        priority: form.priority,
        due: fromDateInput(form.due),
        labels: parseLabels(),
        description: form.description,
      });
    }
    emit('saved', result);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="backdrop" @click.self="emit('close')">
    <div class="card dialog">
      <header class="row">
        <h3>{{ heading }}</h3>
        <span class="spacer" />
        <button class="ghost" @click="emit('close')">✕</button>
      </header>

      <form @submit.prevent="submit">
        <label
          >Title
          <input v-model="form.title" required autofocus />
        </label>

        <div class="grid">
          <label
            >Status
            <select v-model="form.status">
              <option v-for="s in STATUSES" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
            </select>
          </label>
          <label
            >Priority
            <select v-model="form.priority">
              <option v-for="p in PRIORITIES" :key="p" :value="p">{{ PRIORITY_LABELS[p] }}</option>
            </select>
          </label>
          <label
            >Due date
            <input v-model="form.due" type="date" />
          </label>
        </div>

        <label
          >Labels (comma separated)
          <input v-model="form.labels" placeholder="bug, ui, urgent" />
        </label>

        <label class="md-field">
          <span>Description (Markdown)</span>
          <MarkdownEditor
            v-model="form.description"
            :project="props.projectKey ?? props.ticket?.project"
            :ticket-id="props.ticket?.id"
            @attached="onAttachmentsUpdated"
          />
        </label>

        <AttachmentList
          v-if="mode === 'edit' && current"
          :ticket="current"
          @updated="onAttachmentsUpdated"
        />

        <p v-if="error" class="err">{{ error }}</p>

        <footer class="row">
          <button
            v-if="mode === 'edit'"
            type="button"
            class="ghost"
            @click="exportTicket"
          >
            Export…
          </button>
          <span class="spacer" />
          <button type="button" class="ghost" @click="emit('close')">Cancel</button>
          <button type="submit" class="primary" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </footer>
      </form>
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
  z-index: 50;
}
.dialog {
  width: min(680px, 92vw);
  max-height: 90vh;
  overflow: auto;
  padding: 16px 20px 20px;
  border-radius: 8px;
}
h3 {
  margin: 4px 0;
}
form {
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
label input,
label select,
label textarea {
  color: var(--text);
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.err {
  color: var(--danger);
  margin: 0;
}
</style>
