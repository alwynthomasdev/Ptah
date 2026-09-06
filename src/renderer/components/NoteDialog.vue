<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { Note } from '@models/Note';
import { useNotesStore } from '../stores/notes';
import { useNotebooksStore } from '../stores/notebooks';
import { defaultNotebookKey, type NoteFormModel } from '../lib/noteForm';
import NoteForm from './NoteForm.vue';

const props = defineProps<{ notebookKey?: string | null }>();
const emit = defineEmits<{ close: []; saved: [note: Note] }>();

const notes = useNotesStore();
const notebooks = useNotebooksStore();
const error = ref<string | null>(null);
const saving = ref(false);

const form = reactive<NoteFormModel>({
  title: '',
  notebook: defaultNotebookKey(props.notebookKey, notebooks.activeKey, notebooks.orderedItems),
  labels: '',
  body: '',
});

const heading = computed(() => (form.notebook ? `New note in ${form.notebook}` : 'New note'));

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
    if (!form.notebook) throw new Error('Pick a notebook first.');
    const result = await notes.create({
      title: form.title,
      notebook: form.notebook,
      labels: parseLabels(),
      body: form.body,
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
        <NoteForm v-model="form" />

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
.err {
  color: var(--danger);
  margin: 0;
}
</style>
