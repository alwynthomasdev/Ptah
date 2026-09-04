<script setup lang="ts">
/**
 * Swimlane: three horizontal lanes (Scheduled -> WIP -> Done) with a separate
 * collapsible Paused tray beneath. Store-driven via `tickets.inStatus`. Cards
 * drag between lanes; a drop rewrites the ticket's status on disk.
 */
import { computed, ref } from 'vue';
import type { Status, Ticket } from '@models/Ticket';
import { useTicketsStore } from '../stores/tickets';
import TicketCard from '../components/TicketCard.vue';
import TicketDialog from '../components/TicketDialog.vue';

const DND_MIME = 'application/x-ptah-ticket';

const emit = defineEmits<{ changed: [] }>();
const tickets = useTicketsStore();
const editing = ref<Ticket | null>(null);
const pausedOpen = ref(true);
const dropTarget = ref<Status | null>(null);
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

function onDragOver(e: DragEvent, status: Status) {
  if (!e.dataTransfer?.types.includes(DND_MIME)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  dropTarget.value = status;
}

function onDragLeave(status: Status) {
  if (dropTarget.value === status) dropTarget.value = null;
}

async function onDrop(e: DragEvent, status: Status) {
  dropTarget.value = null;
  const id = e.dataTransfer?.getData(DND_MIME);
  if (!id) return;
  const current = tickets.items.find((t) => t.id === id);
  if (!current || current.status === status) return;
  try {
    dndError.value = null;
    await tickets.update(id, { status });
  } catch (err) {
    dndError.value = err instanceof Error ? err.message : String(err);
  }
}

function onSaved() {
  editing.value = null;
  emit('changed');
}
</script>

<template>
  <section class="board">
    <p v-if="dndError" class="err">{{ dndError }}</p>

    <div class="lanes scroll-thin">
      <div v-for="lane in lanes" :key="lane.key" class="lane">
        <div class="lane-head">
          <span class="dot" :style="{ background: lane.color }" />
          {{ lane.label }}
          <span class="n">{{ lane.items.length }}</span>
        </div>
        <div
          class="lane-body"
          :class="{ 'drop-target': dropTarget === lane.key }"
          @dragover="onDragOver($event, lane.key)"
          @dragleave="onDragLeave(lane.key)"
          @drop.prevent="onDrop($event, lane.key)"
        >
          <TicketCard v-for="t in lane.items" :key="t.id" :ticket="t" @open="editing = $event" />
        </div>
      </div>
    </div>

    <div class="paused-tray">
      <div class="paused-tray-head" @click="pausedOpen = !pausedOpen">
        <span class="dot" />
        <b>Paused</b>
        <span class="n">{{ paused.length }}</span>
        <span class="chevron">{{ pausedOpen ? '▾ hide' : '▸ show' }}</span>
      </div>
      <div
        v-show="pausedOpen"
        class="paused-tray-body scroll-thin"
        :class="{ 'drop-target': dropTarget === 'paused' }"
        @dragover="onDragOver($event, 'paused')"
        @dragleave="onDragLeave('paused')"
        @drop.prevent="onDrop($event, 'paused')"
      >
        <div v-if="paused.length === 0" class="empty muted">Nothing paused.</div>
        <TicketCard
          v-for="t in paused"
          :key="t.id"
          :ticket="t"
          class="dashed"
          @open="editing = $event"
        />
      </div>
    </div>

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
.board {
  display: flex;
  flex-direction: column;
}
.lanes {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 10px;
}
.lane {
  display: flex;
  flex-direction: column;
  flex: 0 0 280px;
  width: 280px;
}
.lane-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 2px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
}
.lane-head .dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.lane-head .n {
  margin-left: auto;
  font-family: var(--mono);
  color: var(--text-faint);
  font-weight: 400;
}
.lane-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 40px;
  border-radius: 6px;
  transition: background 0.12s ease;
}
.lane-body.drop-target,
.paused-tray-body.drop-target {
  background: var(--surface-2);
  outline: 1px dashed var(--accent);
  outline-offset: 2px;
}

.err {
  margin: 0 0 12px;
  color: var(--danger);
  font-size: 12px;
}

.paused-tray {
  margin-top: 18px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}
.paused-tray-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
}
.paused-tray-head .dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--paused);
}
.paused-tray-head b {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
}
.paused-tray-head .n {
  color: var(--text-faint);
  font-family: var(--mono);
  font-size: 11px;
}
.paused-tray-head .chevron {
  margin-left: auto;
  color: var(--text-faint);
  font-size: 11px;
}
.paused-tray-body {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 12px 12px;
}
.paused-tray-body .dashed {
  border-style: dashed;
  flex: 0 0 280px;
  width: 280px;
}
.empty {
  padding: 2px 0 8px;
  font-size: 12px;
}
</style>
