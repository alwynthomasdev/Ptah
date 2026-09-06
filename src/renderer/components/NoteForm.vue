<script setup lang="ts">
/**
 * Shared field markup for creating/editing a note: title, notebook, labels, and
 * the Markdown body. Bound to a single reactive form object owned by the parent
 * via `v-model`. No submit button — the parent owns Save/Cancel.
 */
import type { NoteFormModel } from '../lib/noteForm';
import { useNotebooksStore } from '../stores/notebooks';
import MarkdownEditor from './MarkdownEditor.vue';

const model = defineModel<NoteFormModel>({ required: true });
const notebooks = useNotebooksStore();
</script>

<template>
  <div class="note-form">
    <label
      >Title
      <input v-model="model.title" required autofocus />
    </label>

    <label
      >Notebook
      <select v-model="model.notebook">
        <option v-for="n in notebooks.orderedItems" :key="n.key" :value="n.key">{{ n.name }}</option>
      </select>
    </label>

    <label
      >Labels (comma separated)
      <input v-model="model.labels" placeholder="idea, meeting, todo" />
    </label>

    <label class="md-field">
      <span>Note (Markdown)</span>
      <MarkdownEditor v-model="model.body" />
    </label>
  </div>
</template>

<style scoped>
.note-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
</style>
