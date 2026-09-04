<script setup lang="ts">
import { computed } from 'vue';
import { useTicketsStore } from '../stores/tickets';
import ThemeToggle from './ThemeToggle.vue';

const tickets = useTicketsStore();

const search = computed({
  get: () => tickets.filter.text ?? '',
  set: (value: string) => tickets.setFilter({ text: value }),
});
</script>

<template>
  <header class="topbar">
    <div class="brand"><span class="mark">P</span> Ptah</div>
    <span class="spacer" />
    <input v-model="search" class="search" type="search" placeholder="Search tickets…" />
    <ThemeToggle />
  </header>
</template>

<style scoped>
.topbar {
  grid-column: 1 / 3;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  letter-spacing: 0.2px;
}
.mark {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: var(--accent);
  color: var(--accent-contrast);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
}
.search {
  width: 220px;
  padding: 6px 10px;
  font-size: 12.5px;
}
</style>
