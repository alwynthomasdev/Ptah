<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Ticket } from '@models/Ticket';
import type { Note } from '@models/Note';
import { formatDate } from '@shared/dates';
import { call, ptah } from '../api';

const emit = defineEmits<{ changed: [] }>();
const items = ref<Ticket[]>([]);
const noteItems = ref<Note[]>([]);
const error = ref<string | null>(null);

async function load() {
  error.value = null;
  try {
    [items.value, noteItems.value] = await Promise.all([
      call(ptah.bin.list()),
      call(ptah.noteBin.list()),
    ]);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

async function restore(id: string) {
  try {
    await call(ptah.bin.restore(id));
    await load();
    emit('changed');
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

async function purge(id: string) {
  if (!confirm(`Permanently delete ${id}? This cannot be undone.`)) return;
  await call(ptah.bin.purge(id));
  await load();
}

async function restoreNote(id: string) {
  try {
    await call(ptah.noteBin.restore(id));
    await load();
    emit('changed');
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

async function purgeNote(id: string) {
  if (!confirm(`Permanently delete ${id}? This cannot be undone.`)) return;
  await call(ptah.noteBin.purge(id));
  await load();
}

async function emptyBin() {
  if (!confirm('Permanently delete everything in the recycle bin?')) return;
  await Promise.all([call(ptah.bin.empty()), call(ptah.noteBin.empty())]);
  await load();
}

onMounted(load);
</script>

<template>
  <section class="view">
    <header class="row">
      <h2>Recycle Bin</h2>
      <span class="tag">{{ items.length + noteItems.length }}</span>
      <span class="spacer" />
      <button
        class="danger"
        :disabled="items.length === 0 && noteItems.length === 0"
        @click="emptyBin"
      >
        Empty bin
      </button>
    </header>

    <p v-if="error" class="err">{{ error }}</p>

    <div v-if="items.length === 0 && noteItems.length === 0" class="muted">
      The recycle bin is empty.
    </div>

    <template v-else>
      <div v-if="items.length" class="group">
        <h3 class="group-head">Tickets <span class="tag">{{ items.length }}</span></h3>
        <ul class="list">
          <li v-for="t in items" :key="t.id" class="card item">
            <span class="id muted">{{ t.id }}</span>
            <span class="title">{{ t.title }}</span>
            <span class="spacer" />
            <span class="muted small">deleted {{ formatDate(t.deletedAt) }}</span>
            <button class="ghost" @click="restore(t.id)">Restore</button>
            <button class="danger" @click="purge(t.id)">Delete forever</button>
          </li>
        </ul>
      </div>

      <div v-if="noteItems.length" class="group">
        <h3 class="group-head">Notes <span class="tag">{{ noteItems.length }}</span></h3>
        <ul class="list">
          <li v-for="n in noteItems" :key="n.id" class="card item">
            <span class="id muted">{{ n.id }}</span>
            <span class="title">{{ n.title }}</span>
            <span class="spacer" />
            <span class="muted small">deleted {{ formatDate(n.deletedAt) }}</span>
            <button class="ghost" @click="restoreNote(n.id)">Restore</button>
            <button class="danger" @click="purgeNote(n.id)">Delete forever</button>
          </li>
        </ul>
      </div>
    </template>
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
.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.group-head {
  margin: 6px 0 0;
  font-size: 13px;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
}
.id {
  min-width: 68px;
  font-size: 12px;
}
.title {
  font-weight: 500;
}
.small {
  font-size: 12px;
}
.err {
  color: var(--danger);
}
</style>
