<script setup lang="ts">
import { nextTick, ref } from 'vue';
import type { Ticket } from '@models/Ticket';
import { todayIso } from '@shared/dates';
import { useTicketsStore } from '../stores/tickets';
import { useProjectsStore } from '../stores/projects';
import { defaultProjectKey } from '../lib/ticketForm';

const props = defineProps<{
  projectKey?: string | null;
  /** Render inline to fill a host container (the standalone window) instead of as a modal overlay. */
  embedded?: boolean;
}>();
const emit = defineEmits<{ close: []; created: [ticket: Ticket] }>();

const tickets = useTicketsStore();
const projects = useProjectsStore();

const title = ref('');
const project = ref(
  defaultProjectKey(props.projectKey, projects.activeKey, projects.orderedItems),
);
const lastAdded = ref<string | null>(null);
const error = ref<string | null>(null);
const saving = ref(false);
const titleInput = ref<HTMLInputElement | null>(null);

async function submit() {
  const trimmed = title.value.trim();
  if (!trimmed || !project.value || saving.value) return;
  error.value = null;
  saving.value = true;
  try {
    const ticket = await tickets.create({
      title: trimmed,
      project: project.value,
      due: todayIso(),
    });
    lastAdded.value = ticket.id;
    title.value = '';
    emit('created', ticket);
    await nextTick();
    titleInput.value?.focus();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div
    :class="props.embedded ? 'embedded' : 'backdrop'"
    @click.self="!props.embedded && emit('close')"
    @keydown.esc="emit('close')"
  >
    <div class="card dialog" :class="{ flush: props.embedded }">
      <header class="row">
        <h3>Quick add</h3>
        <span class="spacer" />
        <button class="ghost" @click="emit('close')">✕</button>
      </header>

      <form @submit.prevent="submit">
        <label
          >Title
          <input
            ref="titleInput"
            v-model="title"
            required
            autofocus
            placeholder="What needs doing?"
            @input="lastAdded = null"
          />
        </label>

        <label
          >Project
          <select v-model="project">
            <option v-for="p in projects.orderedItems" :key="p.key" :value="p.key">
              {{ p.name }}
            </option>
          </select>
        </label>

        <p v-if="error" class="err">{{ error }}</p>
        <p v-else-if="lastAdded" class="ok">Added {{ lastAdded }}</p>

        <footer class="row">
          <span class="spacer" />
          <button type="button" class="ghost" @click="emit('close')">Close</button>
          <button type="submit" class="primary" :disabled="saving || !title.trim() || !project">
            {{ saving ? 'Adding…' : 'Add' }}
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
.embedded {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.dialog {
  width: min(420px, 92vw);
  max-height: 90vh;
  overflow: auto;
  padding: 16px 20px 20px;
  border-radius: var(--radius-lg);
}
.dialog.flush {
  width: 100%;
  height: 100%;
  max-height: none;
  border: none;
  border-radius: 0;
  background: var(--bg);
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
.ok {
  color: var(--ok);
  margin: 0;
}
</style>
