<script setup lang="ts">
import { ref } from 'vue';
import type { Ticket } from '@models/Ticket';
import { formatDate, isOverdue } from '@shared/dates';

const props = defineProps<{ ticket: Ticket }>();
const emit = defineEmits<{ open: [ticket: Ticket] }>();

/** MIME used to carry the dragged ticket id between card and swimlane lanes. */
const DND_MIME = 'application/x-ptah-ticket';
const dragging = ref(false);

function onDragStart(e: DragEvent) {
  if (!e.dataTransfer) return;
  e.dataTransfer.setData(DND_MIME, props.ticket.id);
  e.dataTransfer.effectAllowed = 'move';
  dragging.value = true;
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
</style>
