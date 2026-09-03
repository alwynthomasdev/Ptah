<script setup lang="ts">
import type { Ticket } from '@models/Ticket';
import { PRIORITY_LABELS, STATUS_LABELS } from '@models/Ticket';
import { formatDate, isOverdue } from '@shared/dates';

defineProps<{ tickets: Ticket[]; empty?: string }>();
const emit = defineEmits<{ open: [ticket: Ticket]; remove: [ticket: Ticket] }>();
</script>

<template>
  <div v-if="tickets.length === 0" class="muted pad">{{ empty ?? 'No tickets.' }}</div>
  <ul v-else class="list">
    <li v-for="t in tickets" :key="t.id" class="card item" @click="emit('open', t)">
      <span
        class="prio"
        :style="{ background: `var(--prio-${t.priority})` }"
        :title="PRIORITY_LABELS[t.priority]"
      />
      <span class="id">{{ t.id }}</span>
      <span class="title">{{ t.title }}</span>
      <span v-for="l in t.labels" :key="l" class="tag">{{ l }}</span>
      <span class="spacer" />
      <span v-if="t.due" class="tag" :class="{ overdue: isOverdue(t.due) }">
        due {{ formatDate(t.due) }}
      </span>
      <span class="tag">{{ STATUS_LABELS[t.status] }}</span>
      <button class="ghost small" title="Delete" @click.stop="emit('remove', t)">🗑</button>
    </li>
  </ul>
</template>

<style scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
}
.item:hover {
  border-color: var(--accent);
}
.prio {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.id {
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  font-size: 12px;
  min-width: 68px;
}
.title {
  font-weight: 500;
}
.overdue {
  color: #fff;
  background: var(--danger);
  border-color: var(--danger);
}
.small {
  padding: 2px 6px;
}
.pad {
  padding: 24px;
}
</style>
