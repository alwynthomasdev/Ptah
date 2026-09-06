<script setup lang="ts">
/**
 * Routed note detail page (`/note/:id`). Preview renders the note read-only;
 * Edit swaps in `NoteForm` bound to a local clone so Cancel is a true revert.
 */
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Note } from '@models/Note';
import { formatDate } from '@shared/dates';
import { useNotesStore } from '../stores/notes';
import { useNotebooksStore } from '../stores/notebooks';
import { call, ptah } from '../api';
import NoteForm from '../components/NoteForm.vue';
import type { NoteFormModel } from '../lib/noteForm';
import MarkdownView from '../components/MarkdownView.vue';

const route = useRoute();
const router = useRouter();
const notes = useNotesStore();
const notebooks = useNotebooksStore();

const booting = ref(true);
const error = ref<string | null>(null);
const note = ref<Note | null>(null);

const mode = ref<'preview' | 'edit'>('preview');
const saving = ref(false);
const saveError = ref<string | null>(null);
const form = ref<NoteFormModel | null>(null);

const id = computed(() => String(route.params.id));
const notebookName = computed(() =>
  note.value ? (notebooks.byKey(note.value.notebook)?.name ?? note.value.notebook) : '',
);

async function load() {
  booting.value = true;
  error.value = null;
  try {
    note.value = await call(ptah.notes.get(id.value));
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    booting.value = false;
  }
}

onMounted(load);

function startEdit() {
  if (!note.value) return;
  form.value = {
    title: note.value.title,
    notebook: note.value.notebook,
    labels: note.value.labels.join(', '),
    body: note.value.body,
  };
  saveError.value = null;
  mode.value = 'edit';
}

function cancelEdit() {
  form.value = null;
  mode.value = 'preview';
}

function parseLabels(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function save() {
  if (!note.value || !form.value) return;
  const notebookChanged = form.value.notebook !== note.value.notebook;
  if (notebookChanged) {
    if (!confirm('Moving this note to a different notebook will assign it a new ID. Continue?')) {
      return;
    }
  }
  saving.value = true;
  saveError.value = null;
  try {
    let updated = await notes.update(note.value.id, {
      title: form.value.title,
      labels: parseLabels(form.value.labels),
      body: form.value.body,
    });
    if (notebookChanged) {
      updated = await notes.changeNotebook(updated.id, form.value.notebook);
    }
    note.value = updated;
    form.value = null;
    mode.value = 'preview';
    if (notebookChanged) router.replace(`/note/${updated.id}`);
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!note.value) return;
  if (!confirm(`Move ${note.value.id} to the recycle bin?`)) return;
  await notes.remove(note.value.id);
  router.push('/notes');
}

async function exportNote() {
  if (!note.value) return;
  error.value = null;
  try {
    await call(ptah.io.exportNote(note.value.id));
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}
</script>

<template>
  <section class="view">
    <div v-if="booting" class="muted pad">Loading…</div>
    <div v-else-if="error" class="pad">
      <p class="err">{{ error }}</p>
      <button @click="load">Retry</button>
    </div>

    <template v-else-if="note">
      <header class="row head">
        <button class="ghost" @click="router.back()">← Back</button>
        <span class="spacer" />
        <button v-if="mode === 'preview'" class="ghost" @click="exportNote">Export…</button>
        <button v-if="mode === 'preview'" class="ghost" @click="startEdit">Edit</button>
        <button v-if="mode === 'preview'" class="ghost danger" @click="remove">Delete</button>
      </header>

      <div class="card block">
        <template v-if="mode === 'preview'">
          <div class="title-row">
            <span class="card-id">{{ note.id }}</span>
            <h2>{{ note.title }}</h2>
          </div>

          <div class="meta row">
            <span class="dim">{{ notebookName }}</span>
            <span class="dim">Updated {{ formatDate(note.updated) }}</span>
          </div>

          <div v-if="note.labels.length" class="labels">
            <span v-for="l in note.labels" :key="l" class="label">{{ l }}</span>
          </div>

          <div class="body">
            <MarkdownView v-if="note.body.trim()" :source="note.body" />
            <p v-else class="muted">This note is empty.</p>
          </div>
        </template>

        <template v-else-if="form">
          <NoteForm v-model="form" />

          <p v-if="saveError" class="err">{{ saveError }}</p>

          <footer class="row">
            <span class="spacer" />
            <button type="button" class="ghost" @click="cancelEdit">Cancel</button>
            <button type="button" class="primary" :disabled="saving" @click="save">
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </footer>
        </template>
      </div>
    </template>
  </section>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 780px;
}
.head {
  gap: 8px;
}
.block {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.title-row h2 {
  margin: 0;
}
.card-id {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-faint);
}
.meta {
  gap: 12px;
}
.dim {
  color: var(--text-faint);
  font-size: var(--fs-sm);
}
.labels {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pad {
  padding: 24px 0;
}
.err {
  color: var(--danger);
}
.danger {
  color: var(--danger);
}
</style>
