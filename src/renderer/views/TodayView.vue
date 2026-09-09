<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { Priority, Status, Ticket } from '@models/Ticket';
import { useTicketsStore } from '../stores/tickets';
import { call, ptah } from '../api';
import TicketList from '../components/TicketList.vue';
import Swimlane from '../components/Swimlane.vue';

const emit = defineEmits<{ changed: [] }>();
const tickets = useTicketsStore();
const router = useRouter();

/** Per-device view preference; mirrors the `ptah-theme` pattern in settings.ts. */
const STORAGE_KEY = 'ptah-today-view';
const mode = ref<'list' | 'swimlane'>(
  (() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'swimlane' ? 'swimlane' : 'list';
    } catch {
      return 'list';
    }
  })(),
);
watch(mode, (m) => {
  try {
    localStorage.setItem(STORAGE_KEY, m);
  } catch {
    /* private mode / storage disabled — the choice just won't persist */
  }
});

const rows = computed<Ticket[]>(() => tickets.dueToday);
const overdue = computed(() => tickets.dueTodayOverdueCount);

/**
 * Swimlane lanes for the Today set. `dueToday` already excludes done/archive and
 * is sorted most-overdue-first, so bucketing by status keeps that order. The
 * Done lane is intentionally always empty — it exists as a drop target, and
 * dropping there clears the ticket off Today.
 */
const bucket = (s: Status) => rows.value.filter((t) => t.status === s);
const lanes = computed(() => [
  { key: 'backlog' as Status, label: 'Backlog', color: 'var(--backlog)', items: bucket('backlog') },
  {
    key: 'scheduled' as Status,
    label: 'Scheduled',
    color: 'var(--scheduled)',
    items: bucket('scheduled'),
  },
  { key: 'wip' as Status, label: 'WIP', color: 'var(--wip)', items: bucket('wip') },
  { key: 'done' as Status, label: 'Done', color: 'var(--done)', items: [] as Ticket[] },
]);
const paused = computed(() => bucket('paused'));
const dndError = ref<string | null>(null);

async function remove(t: Ticket) {
  if (!confirm(`Move ${t.id} to the recycle bin?`)) return;
  await tickets.remove(t.id);
  emit('changed');
}

async function exportTicket(t: Ticket) {
  await call(ptah.io.exportTicket(t.id));
}

async function setDue(t: Ticket, iso: string) {
  await tickets.update(t.id, { due: iso });
  emit('changed');
}

async function setPriority(t: Ticket, priority: Priority) {
  await tickets.update(t.id, { priority });
  emit('changed');
}

async function onMove(id: string, status: Status) {
  try {
    dndError.value = null;
    await tickets.update(id, { status });
    emit('changed');
  } catch (err) {
    dndError.value = err instanceof Error ? err.message : String(err);
  }
}

function open(t: Ticket) {
  router.push({ name: 'ticket', params: { id: t.id } });
}
</script>

<template>
  <section class="view">
    <header class="head">
      <h1>Today</h1>
      <p class="sub">
        <span>{{ rows.length }} due today or earlier</span>
        <span v-if="overdue > 0" class="warn">⚠ {{ overdue }} overdue</span>
      </p>
      <div class="view-toggle">
        <button type="button" :class="{ active: mode === 'list' }" @click="mode = 'list'">
          List
        </button>
        <button type="button" :class="{ active: mode === 'swimlane' }" @click="mode = 'swimlane'">
          Swimlane
        </button>
      </div>
    </header>

    <TicketList
      v-if="mode === 'list'"
      :tickets="rows"
      variant="list"
      :show-snooze="true"
      empty="Nothing due today. 🎉"
      @open="open"
      @remove="remove"
      @export="exportTicket"
      @set-priority="setPriority"
      @set-due="setDue"
    />
    <Swimlane
      v-else
      :lanes="lanes"
      :paused="paused"
      :error="dndError"
      card-controls
      :card-snooze="true"
      @move="onMove"
      @open="open"
      @set-priority="setPriority"
      @set-due="setDue"
    />
  </section>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.head h1 {
  margin: 0;
  font-size: 16px;
}
.sub {
  margin: 0;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-faint);
}
.sub .warn {
  color: var(--p-highest);
  font-weight: 600;
}
.view-toggle {
  display: flex;
  margin-top: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  align-self: flex-start;
}
.view-toggle button {
  border: none;
  border-radius: 0;
  background: var(--surface-2);
  color: var(--text-dim);
  font-size: var(--fs-xs);
  padding: 5px 12px;
  cursor: pointer;
}
.view-toggle button:hover {
  color: var(--text);
}
.view-toggle button.active {
  background: var(--accent);
  color: var(--accent-contrast);
  font-weight: 600;
}
.view-toggle button + button {
  border-left: 1px solid var(--border);
}
</style>
