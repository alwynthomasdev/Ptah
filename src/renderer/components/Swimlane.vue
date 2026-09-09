<script setup lang="ts">
/**
 * Presentational swimlane board: horizontal lanes plus a collapsible Paused
 * tray, with card drag-and-drop between them. Purely props/emits — the parent
 * owns persistence. A drop emits `move`; this component never writes anything.
 */
import { ref } from 'vue';
import type { Priority, Status, Ticket } from '@models/Ticket';
import TicketCard from './TicketCard.vue';

interface Lane {
  key: Status;
  label: string;
  color: string;
  items: Ticket[];
}

const props = defineProps<{
  lanes: Lane[];
  paused: Ticket[];
  /** Optional error banner (e.g. a failed status write). */
  error?: string | null;
  /** Show the inline priority menu on each card. */
  cardControls?: boolean;
  /** Also show the snooze menu on each card (requires `cardControls`). */
  cardSnooze?: boolean;
}>();

const emit = defineEmits<{
  move: [id: string, status: Status];
  open: [ticket: Ticket];
  setPriority: [ticket: Ticket, priority: Priority];
  setDue: [ticket: Ticket, iso: string];
}>();

/** MIME used to carry the dragged ticket id between card and lane. */
const DND_MIME = 'application/x-ptah-ticket';

const pausedOpen = ref(true);
const dropTarget = ref<Status | null>(null);

function onDragOver(e: DragEvent, status: Status) {
  if (!e.dataTransfer?.types.includes(DND_MIME)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  dropTarget.value = status;
}

function onDragLeave(status: Status) {
  if (dropTarget.value === status) dropTarget.value = null;
}

function onDrop(e: DragEvent, status: Status) {
  dropTarget.value = null;
  const id = e.dataTransfer?.getData(DND_MIME);
  if (!id) return;
  const current = [...props.lanes.flatMap((l) => l.items), ...props.paused].find(
    (t) => t.id === id,
  );
  if (!current || current.status === status) return;
  emit('move', id, status);
}

function onCardPriority(t: Ticket, priority: Priority) {
  emit('setPriority', t, priority);
}

function onCardDue(t: Ticket, iso: string) {
  emit('setDue', t, iso);
}
</script>

<template>
  <section class="board">
    <p v-if="error" class="err">{{ error }}</p>

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
          <TicketCard
            v-for="t in lane.items"
            :key="t.id"
            :ticket="t"
            :controls="cardControls"
            :show-snooze="cardControls && cardSnooze"
            @open="emit('open', $event)"
            @set-priority="onCardPriority"
            @set-due="onCardDue"
          />
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
          :controls="cardControls"
          :show-snooze="cardControls && cardSnooze"
          @open="emit('open', $event)"
          @set-priority="onCardPriority"
          @set-due="onCardDue"
        />
      </div>
    </div>
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
  flex: 1 1 260px;
  min-width: 260px;
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
  border-radius: var(--radius);
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
  border-radius: var(--radius-lg);
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
