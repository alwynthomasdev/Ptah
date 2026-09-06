<script setup lang="ts">
import { ref, type CSSProperties } from 'vue';
import type { Priority, Ticket } from '@models/Ticket';
import { PRIORITIES, PRIORITY_LABELS, STATUS_LABELS } from '@models/Ticket';
import { formatDate, isOverdue } from '@shared/dates';

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
}>();
const emit = defineEmits<{
  open: [ticket: Ticket];
  remove: [ticket: Ticket];
  export: [ticket: Ticket];
  setPriority: [ticket: Ticket, priority: Priority];
}>();

const dateHeading = props.variant === 'list' ? 'Due' : 'Created';

/** Id of the ticket whose priority menu is open, or null. */
const priorityMenuFor = ref<string | null>(null);

function choosePriority(t: Ticket, priority: Priority) {
  priorityMenuFor.value = null;
  if (priority !== t.priority) emit('setPriority', t, priority);
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
          :class="{ overdue: isOverdue(t.due) }"
        >
          {{ formatDate(t.due) }}
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
.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-dropdown);
}
.menu {
  position: absolute;
  z-index: calc(var(--z-dropdown) + 1);
  top: calc(100% + 2px);
  left: 0;
  min-width: 130px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.menu-opt {
  text-align: left;
  padding: 5px 8px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font: inherit;
  font-size: var(--fs-sm);
  cursor: pointer;
}
.menu-opt:hover {
  background: var(--surface-2);
}
.menu-opt.on {
  background: var(--surface-2);
  font-weight: 600;
}
.due {
  color: var(--text-faint);
  white-space: nowrap;
}
.due.overdue {
  color: var(--p-highest);
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
