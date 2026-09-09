<script setup lang="ts">
import { ref } from 'vue';
import type { Priority, Ticket } from '@models/Ticket';
import { PRIORITIES, PRIORITY_LABELS } from '@models/Ticket';
import { formatDate, isOverdue } from '@shared/dates';
import { SNOOZE } from '../lib/snooze';

const props = defineProps<{
  ticket: Ticket;
  /** Show the inline priority menu (and, with `showSnooze`, the snooze menu). */
  controls?: boolean;
  /** Show the snooze menu — only has an effect with `controls` and a due date. */
  showSnooze?: boolean;
}>();
const emit = defineEmits<{
  open: [ticket: Ticket];
  setPriority: [ticket: Ticket, priority: Priority];
  setDue: [ticket: Ticket, iso: string];
}>();

/** MIME used to carry the dragged ticket id between card and swimlane lanes. */
const DND_MIME = 'application/x-ptah-ticket';
const dragging = ref(false);

function onDragStart(e: DragEvent) {
  if (!e.dataTransfer) return;
  e.dataTransfer.setData(DND_MIME, props.ticket.id);
  e.dataTransfer.effectAllowed = 'move';
  dragging.value = true;
}

const priorityMenuOpen = ref(false);
const dueMenuOpen = ref(false);

function choosePriority(p: Priority) {
  priorityMenuOpen.value = false;
  if (p !== props.ticket.priority) emit('setPriority', props.ticket, p);
}

function chooseDue(opt: (typeof SNOOZE)[number]) {
  dueMenuOpen.value = false;
  emit('setDue', props.ticket, opt.to());
}
</script>

<template>
  <article
    class="card"
    :class="{ dragging }"
    draggable="true"
    @click="emit('open', ticket)"
    @dragstart="onDragStart"
    @dragend="dragging = false"
  >
    <span class="pri-bar" :style="{ background: `var(--p-${ticket.priority})` }" />
    <div class="card-top"><span class="card-id">{{ ticket.id }}</span></div>
    <div class="card-top title-row"><span class="card-title">{{ ticket.title }}</span></div>
    <div class="card-meta">
      <span v-for="l in ticket.labels" :key="l" class="label">{{ l }}</span>
      <span v-if="ticket.due" class="due" :class="{ overdue: isOverdue(ticket.due) }">
        {{ formatDate(ticket.due) }}<template v-if="isOverdue(ticket.due)"> · overdue</template>
      </span>
    </div>

    <div
      v-if="controls"
      class="card-controls"
      draggable="false"
      @click.stop
      @dragstart.stop.prevent
    >
      <span class="card-menu">
        <button
          type="button"
          class="prio-btn"
          :style="{ color: `var(--p-${ticket.priority})` }"
          @click="priorityMenuOpen = !priorityMenuOpen"
        >
          {{ PRIORITY_LABELS[ticket.priority] }}
          <span class="caret">▾</span>
        </button>
        <template v-if="priorityMenuOpen">
          <div class="menu-backdrop" @click="priorityMenuOpen = false" />
          <div class="menu">
            <button
              v-for="p in PRIORITIES"
              :key="p"
              type="button"
              class="menu-opt"
              :class="{ on: p === ticket.priority }"
              :style="{ color: `var(--p-${p})` }"
              @click="choosePriority(p)"
            >
              {{ PRIORITY_LABELS[p] }}
            </button>
          </div>
        </template>
      </span>

      <span v-if="showSnooze && ticket.due" class="card-menu">
        <button
          type="button"
          class="snooze-btn"
          :aria-label="`Snooze ${ticket.id}`"
          @click="dueMenuOpen = !dueMenuOpen"
        >
          ▾ snooze
        </button>
        <template v-if="dueMenuOpen">
          <div class="menu-backdrop" @click="dueMenuOpen = false" />
          <div class="menu">
            <button
              v-for="opt in SNOOZE"
              :key="opt.label"
              type="button"
              class="menu-opt"
              @click="chooseDue(opt)"
            >
              {{ opt.label }}
            </button>
          </div>
        </template>
      </span>
    </div>
  </article>
</template>

<style scoped>
.card {
  padding: 10px 11px;
  cursor: pointer;
  position: relative;
}
.card:hover {
  border-color: var(--text-faint);
}
.card.dragging {
  opacity: 0.45;
}
.pri-bar {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 2px;
}
.card-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-left: 8px;
}
.title-row {
  margin-top: 2px;
}
.card-id {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-faint);
}
.card-title {
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-left: 8px;
}
.due {
  font-size: 11px;
  color: var(--text-faint);
  margin-left: auto;
}
.due.overdue {
  color: var(--p-highest);
}
.card-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-left: 8px;
}
.card-menu {
  position: relative;
}
.prio-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: inherit;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.prio-btn:hover {
  border-color: var(--text-faint);
}
.prio-btn .caret {
  font-size: 9px;
  color: var(--text-faint);
}
.snooze-btn {
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-faint);
  font: inherit;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}
.snooze-btn:hover {
  border-color: var(--text-faint);
  color: var(--text);
}
</style>
