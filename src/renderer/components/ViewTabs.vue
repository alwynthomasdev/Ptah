<script setup lang="ts">
const views = [
  { to: '/board', label: 'Swimlane' },
  { to: '/list', label: 'List' },
  { to: '/backlog', label: 'Backlog' },
  { to: '/archive', label: 'Archive' },
];
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
</style>
