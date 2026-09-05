<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import type { Priority, Status, Ticket } from '@models/Ticket';
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from '@models/Ticket';
import type { TicketFilter } from '@models/Filter';
import { filterAndSort } from '@models/Filter';
import { useTicketsStore } from '../stores/tickets';
import { useProjectsStore } from '../stores/projects';
import { call, ptah } from '../api';
import TicketList from '../components/TicketList.vue';
import FilterChip from '../components/FilterChip.vue';

const emit = defineEmits<{ changed: [] }>();
const tickets = useTicketsStore();
const projects = useProjectsStore();
const router = useRouter();

const filter = reactive<TicketFilter>({});

const statusOptions = STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));
const priorityOptions = PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }));
const labelOptions = computed(() => {
  const seen = new Set<string>();
  for (const t of tickets.items) for (const l of t.labels) seen.add(l);
  return [...seen].sort((a, b) => a.localeCompare(b)).map((l) => ({ value: l, label: l }));
});
const projectOptions = computed(() => projects.orderedItems.map((p) => ({ value: p.key, label: p.name })));

const selectedStatuses = computed(() => filter.statuses ?? []);
const selectedPriorities = computed(() => filter.priorities ?? []);
const selectedLabels = computed(() => filter.labels ?? []);
const selectedProjects = computed(() => filter.projects ?? []);

function setStatuses(v: string[]) {
  filter.statuses = v.length ? (v as Status[]) : undefined;
}
function setPriorities(v: string[]) {
  filter.priorities = v.length ? (v as Priority[]) : undefined;
}
function setLabels(v: string[]) {
  filter.labels = v.length ? v : undefined;
}
function setProjects(v: string[]) {
  filter.projects = v.length ? v : undefined;
}

const hasAnyFilter = computed(
  () =>
    !!filter.text?.trim() ||
    !!filter.statuses?.length ||
    !!filter.priorities?.length ||
    !!filter.labels?.length ||
    !!filter.projects?.length,
);

const results = computed<Ticket[]>(() =>
  hasAnyFilter.value ? filterAndSort(tickets.items, filter, { key: 'priority', dir: 'desc' }) : [],
);

async function remove(t: Ticket) {
  if (!confirm(`Move ${t.id} to the recycle bin?`)) return;
  await tickets.remove(t.id);
  emit('changed');
}

async function exportTicket(t: Ticket) {
  await call(ptah.io.exportTicket(t.id));
}

function open(t: Ticket) {
  router.push({ name: 'ticket', params: { id: t.id } });
}
</script>

<template>
  <section class="view">
    <div class="row">
      <input
        v-model="filter.text"
        class="search"
        type="search"
        placeholder="Search every ticket, in every project…"
        autofocus
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
        label="Project"
        :options="projectOptions"
        :selected="selectedProjects"
        @update:selected="setProjects"
      />
    </div>
    <p v-if="!hasAnyFilter" class="muted pad">Type or choose a filter to search across every project.</p>
    <TicketList
      v-else
      :tickets="results"
      variant="list"
      empty="No matching tickets."
      @open="open"
      @remove="remove"
      @export="exportTicket"
    />
  </section>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.search {
  max-width: 420px;
  padding: 8px 12px;
  font-size: 13px;
}
.pad {
  padding: 24px 0;
}
</style>
