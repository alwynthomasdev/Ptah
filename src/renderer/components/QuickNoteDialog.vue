<script setup lang="ts">
import { nextTick, ref } from 'vue';
import type { Note } from '@models/Note';
import { useNotesStore } from '../stores/notes';
import { useNotebooksStore } from '../stores/notebooks';
import { defaultNotebookKey } from '../lib/noteForm';

const props = defineProps<{
  notebookKey?: string | null;
  /** Render inline to fill a host container (the standalone window) instead of as a modal overlay. */
  embedded?: boolean;
}>();
const emit = defineEmits<{ close: []; created: [note: Note] }>();

const notes = useNotesStore();
const notebooks = useNotebooksStore();

const title = ref('');
const body = ref('');
const notebook = ref(
  defaultNotebookKey(props.notebookKey, notebooks.activeKey, notebooks.orderedItems),
);
const lastAdded = ref<string | null>(null);
const error = ref<string | null>(null);
const saving = ref(false);
const titleInput = ref<HTMLInputElement | null>(null);

async function submit() {
  const trimmed = title.value.trim();
  if (!trimmed || !notebook.value || saving.value) return;
  error.value = null;
  saving.value = true;
  try {
    const note = await notes.create({
      title: trimmed,
      notebook: notebook.value,
      body: body.value,
    });
    lastAdded.value = note.id;
    title.value = '';
    body.value = '';
    emit('created', note);
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
        <h3>Quick note</h3>
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
            placeholder="Note title"
            @input="lastAdded = null"
          />
        </label>

        <label
          >Notebook
          <select v-model="notebook">
            <option v-for="n in notebooks.orderedItems" :key="n.key" :value="n.key">
              {{ n.name }}
            </option>
          </select>
        </label>

        <label class="body-field"
          >Note
          <textarea v-model="body" rows="5" placeholder="Markdown…" />
        </label>

        <p v-if="error" class="err">{{ error }}</p>
        <p v-else-if="lastAdded" class="ok">Added {{ lastAdded }}</p>

        <footer class="row">
          <span class="spacer" />
          <button type="button" class="ghost" @click="emit('close')">Close</button>
          <button type="submit" class="primary" :disabled="saving || !title.trim() || !notebook">
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
label select,
label input,
label textarea {
  color: var(--text);
}
.body-field textarea {
  resize: vertical;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.5;
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
