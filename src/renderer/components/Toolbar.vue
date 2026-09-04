<script setup lang="ts">
import { computed } from 'vue';
import type { SortKey } from '@models/Filter';
import type { Priority } from '@models/Ticket';
import { PRIORITIES, PRIORITY_LABELS } from '@models/Ticket';
import { useTicketsStore } from '../stores/tickets';
import { useProjectsStore } from '../stores/projects';
import FilterChip from './FilterChip.vue';

const emit = defineEmits<{ new: [] }>();

const tickets = useTicketsStore();
const projects = useProjectsStore();

const SORT_LABELS: Record<SortKey, string> = {
  priority: 'Priority',
  created: 'Created',
  due: 'Due date',
};

const sortKey = computed({
  get: () => tickets.sort.key,
  set: (key: SortKey) => tickets.setSort({ key, dir: tickets.sort.dir }),
});

function toggleDir() {
  tickets.setSort({ key: tickets.sort.key, dir: tickets.sort.dir === 'asc' ? 'desc' : 'asc' });
}

const priorityOptions = PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }));
const labelOptions = computed(() => tickets.labelsInView.map((l) => ({ value: l, label: l })));
const projectOptions = computed(() => projects.items.map((p) => ({ value: p.key, label: p.name })));

const selectedPriorities = computed(() => tickets.filter.priorities ?? []);
const selectedLabels = computed(() => tickets.filter.labels ?? []);
const selectedProjects = computed(() => tickets.filter.projects ?? []);

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
    !!tickets.filter.labels?.length ||
    !!tickets.filter.priorities?.length ||
    !!tickets.filter.projects?.length,
);

function clearFilters() {
  tickets.setFilter({
    text: undefined,
    labels: undefined,
    priorities: undefined,
    projects: undefined,
  });
}
</script>

<template>
  <div class="toolbar">
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
      @update:selected="setLabels"
    />
    <FilterChip
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

    <span class="spacer" />
    <button class="primary btn-new" :disabled="!projects.activeKey" @click="emit('new')">
      + New ticket
    </button>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
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
.btn-new {
  font-size: 12.5px;
  padding: 6px 12px;
}
</style>
