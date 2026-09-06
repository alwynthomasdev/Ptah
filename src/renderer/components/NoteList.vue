<script setup lang="ts">
import type { Note } from '@models/Note';
import { formatDate } from '@shared/dates';
import { useNotebooksStore } from '../stores/notebooks';

defineProps<{
  notes: Note[];
  empty?: string;
  /** Hide the Notebook column when the list is already scoped to one. */
  hideNotebook?: boolean;
}>();
const emit = defineEmits<{
  open: [note: Note];
  remove: [note: Note];
}>();

const notebooks = useNotebooksStore();

function notebookName(key: string): string {
  return notebooks.byKey(key)?.name ?? key;
}
</script>

<template>
  <div v-if="notes.length === 0" class="muted pad">{{ empty ?? 'No notes.' }}</div>
  <table v-else class="list-table">
    <thead>
      <tr>
        <th class="col-id">ID</th>
        <th>Title</th>
        <th v-if="!hideNotebook">Notebook</th>
        <th>Labels</th>
        <th>Updated</th>
        <th class="col-actions" aria-hidden="true" />
      </tr>
    </thead>
    <tbody>
      <tr v-for="n in notes" :key="n.id" @click="emit('open', n)">
        <td class="card-id">{{ n.id }}</td>
        <td class="cell-title">{{ n.title }}</td>
        <td v-if="!hideNotebook" class="dim">{{ notebookName(n.notebook) }}</td>
        <td>
          <span v-for="l in n.labels" :key="l" class="label">{{ l }}</span>
        </td>
        <td class="dim">{{ formatDate(n.updated) }}</td>
        <td class="col-actions">
          <button class="ghost row-action" title="Delete" @click.stop="emit('remove', n)">🗑</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.list-table {
  width: 100%;
  border-collapse: collapse;
}
.list-table th {
  text-align: left;
  font-size: 10.5px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--text-faint);
  font-weight: 600;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
}
.list-table td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
}
.list-table tbody tr {
  cursor: pointer;
}
.list-table tbody tr:hover td {
  background: var(--surface);
}
.card-id {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-faint);
  white-space: nowrap;
}
.cell-title {
  color: var(--text);
}
.dim {
  color: var(--text-faint);
  white-space: nowrap;
}
.label + .label {
  margin-left: 4px;
}
.col-id {
  width: 1%;
}
.col-actions {
  width: 1%;
  text-align: right;
  white-space: nowrap;
}
.row-action {
  padding: 2px 6px;
  opacity: 0;
}
.list-table tbody tr:hover .row-action {
  opacity: 1;
}
.pad {
  padding: 24px 0;
}
</style>
