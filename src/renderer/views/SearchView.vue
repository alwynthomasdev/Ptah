<script setup lang="ts">
/**
 * Unified search: one box (shared with the top bar via the `search` store) that
 * finds tickets *and* notes, shown in two sections. Facet chips split into a
 * shared row (labels), a tickets row (status / priority / project) and a notes
 * row (notebook).
 */
import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import type { Priority, Status, Ticket } from '@models/Ticket';
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from '@models/Ticket';
import { filterAndSort } from '@models/Filter';
import type { Note } from '@models/Note';
import { useSearchStore } from '../stores/search';
import { useTicketsStore } from '../stores/tickets';
import { useNotesStore } from '../stores/notes';
import { useProjectsStore } from '../stores/projects';
import { useNotebooksStore } from '../stores/notebooks';
import { call, ptah } from '../api';
import TicketList from '../components/TicketList.vue';
import NoteList from '../components/NoteList.vue';
import FilterChip from '../components/FilterChip.vue';

const emit = defineEmits<{ changed: [] }>();
const search = useSearchStore();
const tickets = useTicketsStore();
const notes = useNotesStore();
const projects = useProjectsStore();
const notebooks = useNotebooksStore();
const router = useRouter();

/** Ticket-only facets, local to this view. */
const ticketFacet = reactive<{
  statuses: Status[];
  priorities: Priority[];
  projects: string[];
}>({ statuses: [], priorities: [], projects: [] });

/** Note-only facet. */
const noteFacet = reactive<{ notebooks: string[] }>({ notebooks: [] });

const text = computed({
  get: () => search.query,
  set: (v: string) => search.setQuery(v),
});

const statusOptions = STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));
const priorityOptions = PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }));
const labelOptions = computed(() => {
  const seen = new Set<string>();
  for (const t of tickets.items) for (const l of t.labels) seen.add(l);
  for (const n of notes.items) for (const l of n.labels) seen.add(l);
  return [...seen].sort((a, b) => a.localeCompare(b)).map((l) => ({ value: l, label: l }));
});
const projectOptions = computed(() =>
  projects.orderedItems.map((p) => ({ value: p.key, label: p.name })),
);
const notebookOptions = computed(() =>
  notebooks.orderedItems.map((n) => ({ value: n.key, label: n.name })),
);

const sharedLabels = computed(() => search.labels);
function setLabels(v: string[]) {
  search.setLabels(v);
}
function setStatuses(v: string[]) {
  ticketFacet.statuses = v as Status[];
}
function setPriorities(v: string[]) {
  ticketFacet.priorities = v as Priority[];
}
function setTicketProjects(v: string[]) {
  ticketFacet.projects = v;
}
function setNoteNotebooks(v: string[]) {
  noteFacet.notebooks = v;
}

const hasAnyFilter = computed(
  () =>
    search.hasQuery ||
    ticketFacet.statuses.length > 0 ||
    ticketFacet.priorities.length > 0 ||
    ticketFacet.projects.length > 0 ||
    noteFacet.notebooks.length > 0,
);

/** Ticket results = the shared search plus this view's ticket-only facets. */
const ticketResults = computed<Ticket[]>(() => {
  if (!hasAnyFilter.value) return [];
  return filterAndSort(
    tickets.items,
    {
      text: search.query.trim() || undefined,
      labels: search.labels.length ? search.labels : undefined,
      statuses: ticketFacet.statuses.length ? ticketFacet.statuses : undefined,
      priorities: ticketFacet.priorities.length ? ticketFacet.priorities : undefined,
      projects: ticketFacet.projects.length ? ticketFacet.projects : undefined,
    },
    { key: 'priority', dir: 'desc' },
  );
});

const noteResults = computed<Note[]>(() => {
  if (!hasAnyFilter.value) return [];
  return search.noteResults.filter(
    (n) => !noteFacet.notebooks.length || noteFacet.notebooks.includes(n.notebook),
  );
});

function openTicket(t: Ticket) {
  router.push({ name: 'ticket', params: { id: t.id } });
}
function openNote(n: Note) {
  router.push({ name: 'note', params: { id: n.id } });
}

async function removeTicket(t: Ticket) {
  if (!confirm(`Move ${t.id} to the recycle bin?`)) return;
  await tickets.remove(t.id);
  emit('changed');
}
async function removeNote(n: Note) {
  if (!confirm(`Move ${n.id} to the recycle bin?`)) return;
  await notes.remove(n.id);
  emit('changed');
}
async function exportTicket(t: Ticket) {
  await call(ptah.io.exportTicket(t.id));
}
async function setPriority(t: Ticket, priority: Priority) {
  await tickets.update(t.id, { priority });
  emit('changed');
}
</script>

<template>
  <section class="view">
    <input
      v-model="text"
      class="search"
      type="search"
      placeholder="Search every ticket and note…"
      autofocus
    />

    <div class="facets">
      <div class="facet-row">
        <span class="facet-label">Shared</span>
        <FilterChip
          label="Labels"
          :options="labelOptions"
          :selected="sharedLabels"
          :searchable="true"
          @update:selected="setLabels"
        />
      </div>
      <div class="facet-row">
        <span class="facet-label">Tickets</span>
        <FilterChip
          label="Status"
          :options="statusOptions"
          :selected="ticketFacet.statuses"
          @update:selected="setStatuses"
        />
        <FilterChip
          label="Priority"
          :options="priorityOptions"
          :selected="ticketFacet.priorities"
          @update:selected="setPriorities"
        />
        <FilterChip
          label="Project"
          :options="projectOptions"
          :selected="ticketFacet.projects"
          @update:selected="setTicketProjects"
        />
      </div>
      <div class="facet-row">
        <span class="facet-label">Notes</span>
        <FilterChip
          label="Notebook"
          :options="notebookOptions"
          :selected="noteFacet.notebooks"
          @update:selected="setNoteNotebooks"
        />
      </div>
    </div>

    <p v-if="!hasAnyFilter" class="muted pad">
      Type or choose a filter to search across every project and notebook.
    </p>

    <template v-else>
      <section class="results">
        <h3 class="results-head">Tickets <span class="tag">{{ ticketResults.length }}</span></h3>
        <TicketList
          :tickets="ticketResults"
          variant="list"
          empty="No matching tickets."
          @open="openTicket"
          @remove="removeTicket"
          @export="exportTicket"
          @set-priority="setPriority"
        />
      </section>

      <section class="results">
        <h3 class="results-head">Notes <span class="tag">{{ noteResults.length }}</span></h3>
        <NoteList :notes="noteResults" empty="No matching notes." @open="openNote" @remove="removeNote" />
      </section>
    </template>
  </section>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.search {
  max-width: 480px;
  padding: 8px 12px;
  font-size: 13px;
}
.facets {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.facet-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.facet-label {
  font-size: 10.5px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--text-faint);
  font-weight: 600;
  min-width: 56px;
}
.results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.results-head {
  margin: 8px 0 0;
  font-size: 13px;
}
.pad {
  padding: 24px 0;
}
</style>
