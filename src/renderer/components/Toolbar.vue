<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { SortKey } from '@models/Filter';
import type { Priority, Status } from '@models/Ticket';
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from '@models/Ticket';
import { useTicketsStore } from '../stores/tickets';
import { useProjectsStore } from '../stores/projects';
import FilterChip from './FilterChip.vue';

const tickets = useTicketsStore();
const projects = useProjectsStore();
const route = useRoute();

const SORT_LABELS: Record<SortKey, string> = {
  priority: 'Priority',
  created: 'Created',
  due: 'Due date',
};

const SEARCH_ROUTES = ['list', 'backlog', 'archive'];
const showSearch = computed(() => SEARCH_ROUTES.includes(String(route.name)));
const search = computed({
  get: () => tickets.filter.text ?? '',
  set: (value: string) => tickets.setFilter({ text: value }),
});

const sortKey = computed({
  get: () => tickets.sort.key,
  set: (key: SortKey) => tickets.setSort({ key, dir: tickets.sort.dir }),
});

function toggleDir() {
  tickets.setSort({ key: tickets.sort.key, dir: tickets.sort.dir === 'asc' ? 'desc' : 'asc' });
}

const statusOptions = STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));
const priorityOptions = PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }));
const labelOptions = computed(() => tickets.labelsInView.map((l) => ({ value: l, label: l })));
const projectOptions = computed(() => projects.items.map((p) => ({ value: p.key, label: p.name })));

const selectedStatuses = computed(() => tickets.filter.statuses ?? []);
const selectedPriorities = computed(() => tickets.filter.priorities ?? []);
const selectedLabels = computed(() => tickets.filter.labels ?? []);
const selectedProjects = computed(() => tickets.filter.projects ?? []);

function setStatuses(v: string[]) {
  tickets.setFilter({ statuses: v.length ? (v as Status[]) : undefined });
}
function setPriorities(v: string[]) {
  tickets.setFilter({ priorities: v.length ? (v as Priority[]) : undefined });
}
function setLabels(v: string[]) {
  tickets.setFilter({ labels: v.length ? v : undefined });
}
function setProjects(v: string[]) {
  tickets.setFilter({ projects: v.length ? v : undefined });
}

const hasFilters = computed(
  () =>
    !!tickets.filter.text ||
    !!tickets.filter.statuses?.length ||
    !!tickets.filter.labels?.length ||
    !!tickets.filter.priorities?.length ||
    !!tickets.filter.projects?.length,
);

function clearFilters() {
  tickets.setFilter({
    text: undefined,
    statuses: undefined,
    labels: undefined,
    priorities: undefined,
    projects: undefined,
  });
}
</script>

<template>
  <div class="toolbar">
    <input
      v-if="showSearch"
      v-model="search"
      class="search"
      type="search"
      placeholder="Search tickets…"
    />
    <FilterChip
      label="Status"
      :options="statusOptions"
      :selected="selectedStatuses"
      @update:selected="setStatuses"
    />
    <FilterChip
      label="Priority"
      :options="priorityOptions"
      :selected="selectedPriorities"
      @update:selected="setPriorities"
    />
    <FilterChip
      label="Labels"
      :options="labelOptions"
      :selected="selectedLabels"
      :searchable="true"
      @update:selected="setLabels"
    />
    <FilterChip
      v-if="!projects.activeKey"
      label="Project"
      :options="projectOptions"
      :selected="selectedProjects"
      @update:selected="setProjects"
    />

    <label class="chip">
      <span>Sort: {{ SORT_LABELS[sortKey] }}</span>
      <select v-model="sortKey" aria-label="Sort by">
        <option value="priority">Priority</option>
        <option value="created">Created</option>
        <option value="due">Due date</option>
      </select>
    </label>
    <button class="chip dir" type="button" @click="toggleDir">
      {{ tickets.sort.dir === 'asc' ? '↑ Asc' : '↓ Desc' }}
    </button>

    <button v-if="hasFilters" class="chip clear" type="button" @click="clearFilters">Clear</button>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.search {
  width: 220px;
  padding: 6px 10px;
  font-size: 12.5px;
}
.chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-dim);
  font-size: var(--fs-sm);
  background: var(--surface);
  cursor: pointer;
}
.chip:hover {
  border-color: var(--text-faint);
  color: var(--text);
}
/* The native select overlays the chip so the whole chip is the hit target. */
.chip select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
}
.chip.dir {
  font-family: var(--mono);
}
.chip.clear {
  color: var(--text-faint);
}
</style>
