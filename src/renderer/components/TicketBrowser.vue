<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Ticket } from '@models/Ticket';
import type { ListScope } from '../stores/tickets';
import { useTicketsStore } from '../stores/tickets';
import { call, ptah } from '../api';
import TicketList from './TicketList.vue';
import TicketDialog from './TicketDialog.vue';

const props = defineProps<{
  /** Which slice of statuses this view shows. */
  scope: ListScope;
  /** Column set for the table. */
  variant: 'list' | 'backlog' | 'archive';
  empty?: string;
}>();
const emit = defineEmits<{ changed: [] }>();

const tickets = useTicketsStore();
const editing = ref<Ticket | null>(null);

const shown = computed(() => tickets.scopedList(props.scope));

async function remove(t: Ticket) {
  if (!confirm(`Move ${t.id} to the recycle bin?`)) return;
  await tickets.remove(t.id);
  emit('changed');
}

async function exportTicket(t: Ticket) {
  await call(ptah.io.exportTicket(t.id));
}

function onSaved() {
  editing.value = null;
  emit('changed');
}
</script>

<template>
  <section class="view">
    <TicketList
      :tickets="shown"
      :variant="variant"
      :empty="empty"
      @open="editing = $event"
      @remove="remove"
      @export="exportTicket"
    />

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
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
