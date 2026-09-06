<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Note } from '@models/Note';
import type { NoteSortKey } from '@models/NoteFilter';
import { useNotesStore } from '../stores/notes';
import { useNotebooksStore } from '../stores/notebooks';
import NoteList from '../components/NoteList.vue';

const emit = defineEmits<{ changed: [] }>();

const notes = useNotesStore();
const notebooks = useNotebooksStore();
const router = useRouter();

const SORT_LABELS: Record<NoteSortKey, string> = {
  updated: 'Updated',
  created: 'Created',
  title: 'Title',
};

const sortKey = computed({
  get: () => notes.sort.key,
  set: (key: NoteSortKey) => notes.setSort({ key, dir: notes.sort.dir }),
});

function toggleDir() {
  notes.setSort({ key: notes.sort.key, dir: notes.sort.dir === 'asc' ? 'desc' : 'asc' });
}

const scopedName = computed(() => {
  const keys = notes.filter.notebooks;
  if (!keys || keys.length !== 1) return null;
  return notebooks.byKey(keys[0])?.name ?? keys[0];
});

function open(n: Note) {
  router.push({ name: 'note', params: { id: n.id } });
}

async function remove(n: Note) {
  if (!confirm(`Move ${n.id} to the recycle bin?`)) return;
  await notes.remove(n.id);
  emit('changed');
}
</script>

<template>
  <section class="view">
    <div class="row toolbar">
      <h2>{{ scopedName ? `${scopedName} notes` : 'All notes' }}</h2>
      <span class="tag">{{ notes.visible.length }}</span>
      <span class="spacer" />
      <label class="chip">
        <span>Sort: {{ SORT_LABELS[sortKey] }}</span>
        <select v-model="sortKey" aria-label="Sort by">
          <option value="updated">Updated</option>
          <option value="created">Created</option>
          <option value="title">Title</option>
        </select>
      </label>
      <button class="chip dir" type="button" @click="toggleDir">
        {{ notes.sort.dir === 'asc' ? '↑ Asc' : '↓ Desc' }}
      </button>
    </div>

    <NoteList
      :notes="notes.visible"
      :hide-notebook="!!scopedName"
      empty="No notes yet. Use “+ New note” or the quick-note window."
      @open="open"
      @remove="remove"
    />
  </section>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
h2 {
  margin: 0;
}
.toolbar {
  gap: 10px;
}
.chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-dim);
  font-size: var(--fs-sm);
  background: var(--surface);
  cursor: pointer;
}
.chip:hover {
  border-color: var(--text-faint);
  color: var(--text);
}
.chip select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
}
.chip.dir {
  font-family: var(--mono);
}
</style>
