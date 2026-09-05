<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { Ticket } from '@models/Ticket';
import { DEFAULT_PROJECT_KEY } from '@models/Project';
import { fromDateInput } from '@shared/dates';
import { useTicketsStore } from '../stores/tickets';
import { useProjectsStore } from '../stores/projects';
import type { TicketFormModel } from '../lib/ticketForm';
import TicketForm from './TicketForm.vue';

const props = defineProps<{
  projectKey?: string | null;
}>();
const emit = defineEmits<{ close: []; saved: [ticket: Ticket] }>();

const tickets = useTicketsStore();
const projects = useProjectsStore();
const error = ref<string | null>(null);
const saving = ref(false);

const form = reactive<TicketFormModel>({
  title: '',
  status: 'backlog',
  priority: 'medium',
  due: '',
  labels: '',
  urls: '',
  description: '',
  project:
    props.projectKey ??
    projects.activeKey ??
    (projects.byKey(DEFAULT_PROJECT_KEY) ? DEFAULT_PROJECT_KEY : (projects.items[0]?.key ?? '')),
});

const heading = computed(() =>
  form.project ? `New ticket in ${form.project}` : 'New ticket',
);

function parseLabels(): string[] {
  return form.labels
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseUrls(): string[] {
  return form.urls
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function submit() {
  error.value = null;
  saving.value = true;
  try {
    if (!form.project) throw new Error('Pick a project first.');
    const result = await tickets.create({
      title: form.title,
      project: form.project,
      status: form.status,
      priority: form.priority,
      due: fromDateInput(form.due),
      labels: parseLabels(),
      urls: parseUrls(),
      description: form.description,
    });
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
        <TicketForm v-model="form" :project="form.project" />

        <p v-if="error" class="err">{{ error }}</p>

        <footer class="row">
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
  z-index: var(--z-overlay);
}
.dialog {
  width: min(680px, 92vw);
  max-height: 90vh;
  overflow: auto;
  padding: 16px 20px 20px;
  border-radius: var(--radius-lg);
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
label select {
  color: var(--text);
}
.err {
  color: var(--danger);
  margin: 0;
}
</style>
