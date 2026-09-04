<script setup lang="ts">
import type { CSSProperties } from 'vue';
import type { Ticket } from '@models/Ticket';
import { PRIORITY_LABELS, STATUS_LABELS } from '@models/Ticket';
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
}>();

const dateHeading = props.variant === 'list' ? 'Due' : 'Created';

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
        <td :style="{ color: `var(--p-${t.priority})` }">{{ PRIORITY_LABELS[t.priority] }}</td>
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
  font-size: 10.5px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  display: inline-block;
}
.label + .label {
  margin-left: 4px;
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
