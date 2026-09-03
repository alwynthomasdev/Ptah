<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Ticket } from '@models/Ticket';
import type { SortKey } from '@models/Filter';
import { filterAndSort } from '@models/Filter';
import { useTicketsStore } from '../stores/tickets';
import TicketList from './TicketList.vue';
import TicketDialog from './TicketDialog.vue';

const props = defineProps<{
  title: string;
  /** Which slice of statuses this view shows. */
  scope: 'working' | 'backlog' | 'archive' | 'all';
  empty?: string;
}>();
const emit = defineEmits<{ changed: [] }>();

const tickets = useTicketsStore();
const text = ref('');
const sortKey = ref<SortKey>('priority');
const sortDir = ref<'asc' | 'desc'>('desc');
const editing = ref<Ticket | null>(null);

const scoped = computed(() => {
  const all = tickets.items;
  if (props.scope === 'backlog') return all.filter((t) => t.status === 'backlog');
  if (props.scope === 'archive') return all.filter((t) => t.status === 'archive');
  if (props.scope === 'working') {
    return all.filter((t) => t.status !== 'backlog' && t.status !== 'archive');
  }
  return all;
});

const shown = computed(() =>
  filterAndSort(scoped.value, { text: text.value }, { key: sortKey.value, dir: sortDir.value }),
);

async function remove(t: Ticket) {
  if (!confirm(`Move ${t.id} to the recycle bin?`)) return;
  await tickets.remove(t.id);
  emit('changed');
}

function onSaved() {
  editing.value = null;
  emit('changed');
}
</script>

<template>
  <section class="view">
    <header class="row head">
      <h2>{{ title }}</h2>
      <span class="tag">{{ shown.length }}</span>
      <span class="spacer" />
      <input v-model="text" placeholder="Filter by title…" class="search" />
      <label class="muted sort">
        Sort
        <select v-model="sortKey">
          <option value="priority">Priority</option>
          <option value="created">Created</option>
          <option value="due">Due date</option>
        </select>
      </label>
      <button class="ghost" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'">
        {{ sortDir === 'asc' ? '↑' : '↓' }}
      </button>
    </header>

    <TicketList :tickets="shown" :empty="empty" @open="editing = $event" @remove="remove" />

    <TicketDialog
      v-if="editing"
      mode="edit"
      :ticket="editing"
      @close="editing = null"
      @saved="onSaved"
    />
  </section>
</template>

<style scoped>
.view {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.head h2 {
  margin: 0;
}
.search {
  width: 240px;
}
.sort {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
