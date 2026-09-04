<script setup lang="ts">
import { computed } from 'vue';
import type { Ticket } from '@models/Ticket';
import { useRouter } from 'vue-router';
import type { ListScope } from '../stores/tickets';
import { useTicketsStore } from '../stores/tickets';
import { call, ptah } from '../api';
import TicketList from './TicketList.vue';

const props = defineProps<{
  /** Which slice of statuses this view shows. */
  scope: ListScope;
  /** Column set for the table. */
  variant: 'list' | 'backlog' | 'archive';
  empty?: string;
}>();
const emit = defineEmits<{ changed: [] }>();

const tickets = useTicketsStore();
const router = useRouter();

const shown = computed(() => tickets.scopedList(props.scope));

async function remove(t: Ticket) {
  if (!confirm(`Move ${t.id} to the recycle bin?`)) return;
  await tickets.remove(t.id);
  emit('changed');
}

async function exportTicket(t: Ticket) {
  await call(ptah.io.exportTicket(t.id));
}

function open(t: Ticket) {
  router.push({ name: 'ticket', params: { id: t.id } });
}
</script>

<template>
  <section class="view">
    <TicketList
      :tickets="shown"
      :variant="variant"
      :empty="empty"
      @open="open"
      @remove="remove"
      @export="exportTicket"
    />
  </section>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
