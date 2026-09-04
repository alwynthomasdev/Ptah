<script setup lang="ts">
import { computed } from 'vue';
import { useTicketsStore } from '../stores/tickets';

const tickets = useTicketsStore();

const views = computed(() => [
  { to: '/board', label: 'Swimlane', count: null as number | null },
  { to: '/list', label: 'List', count: tickets.workingCount as number | null },
  { to: '/backlog', label: 'Backlog', count: tickets.statusCounts.backlog as number | null },
  { to: '/archive', label: 'Archive', count: null as number | null },
]);
</script>

<template>
  <nav class="view-tabs">
    <RouterLink
      v-for="v in views"
      :key="v.to"
      :to="v.to"
      class="view-tab"
      active-class="active"
    >
      {{ v.label }}
      <span v-if="v.count !== null" class="count">{{ v.count }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.view-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.view-tab {
  padding: 8px 14px;
  font-size: 12.5px;
  color: var(--text-dim);
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
}
.view-tab:hover {
  color: var(--text);
}
.view-tab.active {
  color: var(--text);
  border-bottom-color: var(--accent);
}
.view-tab .count {
  margin-left: 6px;
  color: var(--text-faint);
  font-size: 11px;
  font-family: var(--mono);
}
</style>
