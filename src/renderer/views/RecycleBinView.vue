<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Ticket } from '@models/Ticket';
import { formatDate } from '@shared/dates';
import { call, ptah } from '../api';

const emit = defineEmits<{ changed: [] }>();
const items = ref<Ticket[]>([]);
const error = ref<string | null>(null);

async function load() {
  error.value = null;
  try {
    items.value = await call(ptah.bin.list());
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

async function emptyBin() {
  if (!confirm('Permanently delete everything in the recycle bin?')) return;
  await call(ptah.bin.empty());
  await load();
}

onMounted(load);
</script>

<template>
  <section class="view">
    <header class="row">
      <h2>Recycle Bin</h2>
      <span class="tag">{{ items.length }}</span>
      <span class="spacer" />
      <button class="danger" :disabled="items.length === 0" @click="emptyBin">Empty bin</button>
    </header>

    <p v-if="error" class="err">{{ error }}</p>

    <div v-if="items.length === 0" class="muted">The recycle bin is empty.</div>
    <ul v-else class="list">
      <li v-for="t in items" :key="t.id" class="card item">
        <span class="id muted">{{ t.id }}</span>
        <span class="title">{{ t.title }}</span>
        <span class="spacer" />
        <span class="muted small">deleted {{ formatDate(t.deletedAt) }}</span>
        <button class="ghost" @click="restore(t.id)">Restore</button>
        <button class="danger" @click="purge(t.id)">Delete forever</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.view {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
h2 {
  margin: 0;
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
