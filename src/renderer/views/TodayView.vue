<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Ticket } from '@models/Ticket';
import { useTicketsStore } from '../stores/tickets';
import { call, ptah } from '../api';
import TicketList from '../components/TicketList.vue';

const emit = defineEmits<{ changed: [] }>();
const tickets = useTicketsStore();
const router = useRouter();

const rows = computed<Ticket[]>(() => tickets.dueToday);
const overdue = computed(() => tickets.dueTodayOverdueCount);

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
    </header>
    <TicketList
      :tickets="rows"
      variant="list"
      :show-snooze="true"
      empty="Nothing due today. 🎉"
      @open="open"
      @remove="remove"
      @export="exportTicket"
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
</style>
