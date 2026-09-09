<script setup lang="ts">
/**
 * The main board: three lanes (Scheduled -> WIP -> Done) plus a Paused tray,
 * store-driven via `tickets.inStatus`. Rendering + drag mechanics live in the
 * shared `Swimlane` component; this view supplies the data and persists a drop.
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { Status, Ticket } from '@models/Ticket';
import { useTicketsStore } from '../stores/tickets';
import Swimlane from '../components/Swimlane.vue';

const tickets = useTicketsStore();
const router = useRouter();
const dndError = ref<string | null>(null);

const lanes = computed(() => [
  {
    key: 'scheduled' as Status,
    label: 'Scheduled',
    color: 'var(--scheduled)',
    items: tickets.inStatus('scheduled'),
  },
  { key: 'wip' as Status, label: 'WIP', color: 'var(--wip)', items: tickets.inStatus('wip') },
  { key: 'done' as Status, label: 'Done', color: 'var(--done)', items: tickets.inStatus('done') },
]);
const paused = computed(() => tickets.inStatus('paused'));

async function onMove(id: string, status: Status) {
  try {
    dndError.value = null;
    await tickets.update(id, { status });
  } catch (err) {
    dndError.value = err instanceof Error ? err.message : String(err);
  }
}

function open(t: Ticket) {
  router.push({ name: 'ticket', params: { id: t.id } });
}
</script>

<template>
  <Swimlane :lanes="lanes" :paused="paused" :error="dndError" @move="onMove" @open="open" />
</template>
