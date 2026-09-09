<script setup lang="ts">
import { ref, type CSSProperties } from 'vue';
import type { Priority, Ticket } from '@models/Ticket';
import { PRIORITIES, PRIORITY_LABELS, STATUS_LABELS } from '@models/Ticket';
import { formatDate, formatDueRelative } from '@shared/dates';
import { SNOOZE } from '../lib/snooze';

const props = defineProps<{
  tickets: Ticket[];
  /**
   * Column set:
   *  - list:    ID · Title · Status · Priority · Labels · Due
   *  - backlog: ID · Title · Priority · Labels · Created
   *  - archive: ID · Title · Priority · Labels · Created
   */
  variant: 'list' | 'backlog' | 'archive';
  empty?: string;
  /** Show the per-row "snooze" menu that bumps the due date (Today view). */
  showSnooze?: boolean;
}>();
const emit = defineEmits<{
  open: [ticket: Ticket];
  remove: [ticket: Ticket];
  export: [ticket: Ticket];
  setPriority: [ticket: Ticket, priority: Priority];
  setDue: [ticket: Ticket, iso: string];
}>();

const dateHeading = props.variant === 'list' ? 'Due' : 'Created';

/** Id of the ticket whose priority menu is open, or null. */
const priorityMenuFor = ref<string | null>(null);

function choosePriority(t: Ticket, priority: Priority) {
  priorityMenuFor.value = null;
  if (priority !== t.priority) emit('setPriority', t, priority);
}

/** Id of the ticket whose snooze menu is open, or null. */
const dueMenuFor = ref<string | null>(null);

function chooseDue(t: Ticket, opt: (typeof SNOOZE)[number]) {
  dueMenuFor.value = null;
  emit('setDue', t, opt.to());
}

/** Relative due label + tone for a row, computed once. */
function due(t: Ticket) {
  return formatDueRelative(t.due);
}

function pillStyle(t: Ticket): CSSProperties {
  return {
    background: `var(--${t.status})`,
    color: t.status === 'wip' ? 'var(--status-fg-wip)' : 'var(--status-fg)',
  };
}
</script>

<template>
  <div v-if="tickets.length === 0" class="muted pad">{{ empty ?? 'No tickets.' }}</div>
  <table v-else class="list-table">
    <thead>
      <tr>
        <th class="col-id">ID</th>
        <th>Title</th>
        <th v-if="variant === 'list'">Status</th>
        <th>Priority</th>
        <th>Labels</th>
        <th>{{ dateHeading }}</th>
        <th class="col-actions" aria-hidden="true" />
      </tr>
    </thead>
    <tbody>
      <tr v-for="t in tickets" :key="t.id" @click="emit('open', t)">
        <td class="card-id">{{ t.id }}</td>
        <td class="cell-title">{{ t.title }}</td>
        <td v-if="variant === 'list'">
          <span class="status-pill" :style="pillStyle(t)">{{ STATUS_LABELS[t.status] }}</span>
        </td>
        <td class="cell-priority" @click.stop>
          <button
            type="button"
            class="prio-btn"
            :style="{ color: `var(--p-${t.priority})` }"
            @click="priorityMenuFor = priorityMenuFor === t.id ? null : t.id"
          >
            {{ PRIORITY_LABELS[t.priority] }}
            <span class="caret">▾</span>
          </button>
          <template v-if="priorityMenuFor === t.id">
            <div class="menu-backdrop" @click="priorityMenuFor = null" />
            <div class="menu">
              <button
                v-for="p in PRIORITIES"
                :key="p"
                type="button"
                class="menu-opt"
                :class="{ on: p === t.priority }"
                :style="{ color: `var(--p-${p})` }"
                @click="choosePriority(t, p)"
              >
                {{ PRIORITY_LABELS[p] }}
              </button>
            </div>
          </template>
        </td>
        <td>
          <span v-for="l in t.labels" :key="l" class="label">{{ l }}</span>
        </td>
        <td
          v-if="variant === 'list'"
          class="due"
          :class="{
            'due--overdue': due(t).tone === 'overdue',
            'due--soon': due(t).tone === 'soon',
          }"
          :title="formatDate(t.due)"
        >
          <template v-if="t.due">
            <span class="due-cal" aria-hidden="true">📅</span>
            <span class="due-text">{{ due(t).text }}</span>
          </template>
          <span v-if="showSnooze" class="snooze" @click.stop>
            <button
              type="button"
              class="snooze-btn"
              :aria-label="`Snooze ${t.id}`"
              @click="dueMenuFor = dueMenuFor === t.id ? null : t.id"
            >
              ▾
            </button>
            <template v-if="dueMenuFor === t.id">
              <div class="menu-backdrop" @click="dueMenuFor = null" />
              <div class="menu">
                <button
                  v-for="opt in SNOOZE"
                  :key="opt.label"
                  type="button"
                  class="menu-opt"
                  @click="chooseDue(t, opt)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </template>
          </span>
        </td>
        <td v-else>{{ formatDate(t.created) }}</td>
        <td class="col-actions">
          <button
            class="ghost row-action"
            title="Export"
            @click.stop="emit('export', t)"
          >
            ⬇
          </button>
          <button
            class="ghost row-action"
            title="Delete"
            @click.stop="emit('remove', t)"
          >
            🗑
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.list-table {
  width: 100%;
  border-collapse: collapse;
}
.list-table th {
  text-align: left;
  font-size: 10.5px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--text-faint);
  font-weight: 600;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
}
.list-table td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
}
.list-table tbody tr {
  cursor: pointer;
}
.list-table tbody tr:hover td {
  background: var(--surface);
}
.card-id {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-faint);
  white-space: nowrap;
}
.cell-title {
  color: var(--text);
}
.status-pill {
  font-size: var(--fs-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  display: inline-block;
}
.label + .label {
  margin-left: 4px;
}
.cell-priority {
  position: relative;
  white-space: nowrap;
}
.prio-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  margin: -2px -6px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
}
.prio-btn:hover {
  border-color: var(--border);
  background: var(--surface-2);
}
.prio-btn .caret {
  font-size: 9px;
  color: var(--text-faint);
  opacity: 0;
}
.list-table tbody tr:hover .prio-btn .caret {
  opacity: 1;
}
/* .menu / .menu-opt / .menu-backdrop are global utilities in styles/base.css. */
.due {
  position: relative;
  color: var(--text-faint);
  white-space: nowrap;
}
.due-cal {
  margin-right: 5px;
  font-size: 11px;
  opacity: 0.8;
}
.due--soon {
  color: var(--p-high);
  font-weight: 600;
}
.due--overdue {
  color: var(--p-highest);
  font-weight: 600;
}
.snooze {
  position: relative;
  margin-left: 6px;
}
.snooze-btn {
  padding: 1px 5px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-faint);
  font: inherit;
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
}
.list-table tbody tr:hover .snooze-btn,
.snooze-btn:focus-visible {
  opacity: 1;
}
.snooze-btn:hover {
  border-color: var(--text-faint);
  color: var(--text);
}
.col-id {
  width: 1%;
}
.col-actions {
  width: 1%;
  text-align: right;
  white-space: nowrap;
}
.row-action {
  padding: 2px 6px;
  opacity: 0;
}
.list-table tbody tr:hover .row-action {
  opacity: 1;
}
.pad {
  padding: 24px 0;
}
</style>
