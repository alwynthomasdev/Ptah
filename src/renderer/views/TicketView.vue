<script setup lang="ts">
/**
 * Routed ticket detail page (`/ticket/:id`). Preview mode renders the ticket
 * read-only; Edit mode swaps in `TicketForm` bound to a local clone so Cancel
 * is a true revert. Not a modal — a full page, matching the other views.
 */
import { computed, ref, onMounted } from 'vue';
import type { CSSProperties } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Ticket } from '@models/Ticket';
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from '@models/Ticket';
import { formatDate, fromDateInput, toDateInput } from '@shared/dates';
import { useTicketsStore } from '../stores/tickets';
import { call, ptah } from '../api';
import TicketForm from '../components/TicketForm.vue';
import type { TicketFormModel } from '../lib/ticketForm';
import AttachmentList from '../components/AttachmentList.vue';
import MarkdownView from '../components/MarkdownView.vue';

const route = useRoute();
const router = useRouter();
const tickets = useTicketsStore();

const booting = ref(true);
const error = ref<string | null>(null);
const ticket = ref<Ticket | null>(null);

const mode = ref<'preview' | 'edit'>('preview');
const saving = ref(false);
const saveError = ref<string | null>(null);
const form = ref<TicketFormModel | null>(null);

const id = computed(() => String(route.params.id));

/** Sub-tasks of this ticket — read straight from the store (all projects loaded). */
const children = computed(() => tickets.childrenOf(id.value));
const parentTicket = computed(() =>
  ticket.value?.parent ? (tickets.items.find((t) => t.id === ticket.value?.parent) ?? null) : null,
);

function goTo(ticketId: string) {
  router.push({ name: 'ticket', params: { id: ticketId } });
}

async function load() {
  booting.value = true;
  error.value = null;
  try {
    ticket.value = await call(ptah.tickets.get(id.value));
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    booting.value = false;
  }
}

onMounted(load);

function statusPillStyle(t: Ticket): CSSProperties {
  return {
    background: `var(--${t.status})`,
    color: t.status === 'wip' ? 'var(--status-fg-wip)' : 'var(--status-fg)',
  };
}

function onAttachmentsUpdated(t: Ticket) {
  ticket.value = t;
  tickets.upsert(t);
}

function startEdit() {
  if (!ticket.value) return;
  form.value = {
    title: ticket.value.title,
    type: ticket.value.type,
    parent: ticket.value.parent ?? '',
    status: ticket.value.status,
    priority: ticket.value.priority,
    due: toDateInput(ticket.value.due),
    labels: ticket.value.labels.join(', '),
    urls: ticket.value.urls.join('\n'),
    description: ticket.value.description,
    project: ticket.value.project,
  };
  saveError.value = null;
  mode.value = 'edit';
}

function cancelEdit() {
  form.value = null;
  mode.value = 'preview';
}

function parseLabels(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseUrls(raw: string): string[] {
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function save() {
  if (!ticket.value || !form.value) return;
  const projectChanged = form.value.project !== ticket.value.project;
  if (projectChanged) {
    if (!confirm('Moving this ticket to a different project will assign it a new ticket ID. Continue?')) {
      return;
    }
  }
  saving.value = true;
  saveError.value = null;
  try {
    let updated = await tickets.update(ticket.value.id, {
      title: form.value.title,
      type: form.value.type,
      parent: form.value.parent || null,
      status: form.value.status,
      priority: form.value.priority,
      due: fromDateInput(form.value.due),
      labels: parseLabels(form.value.labels),
      urls: parseUrls(form.value.urls),
      description: form.value.description,
    });
    if (projectChanged) {
      updated = await tickets.changeProject(updated.id, form.value.project);
      // The move re-links sub-tasks on disk; refresh the store so the
      // sub-tasks list reflects their new parent id.
      await tickets.load();
    }
    ticket.value = updated;
    form.value = null;
    mode.value = 'preview';
    if (projectChanged) {
      router.replace(`/ticket/${updated.id}`);
    }
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!ticket.value) return;
  if (!confirm(`Move ${ticket.value.id} to the recycle bin?`)) return;
  await tickets.remove(ticket.value.id);
  router.back();
}

async function exportTicket() {
  if (!ticket.value) return;
  error.value = null;
  try {
    await call(ptah.io.exportTicket(ticket.value.id));
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

function openUrl(url: string) {
  void ptah.system.openExternal(url);
}
</script>

<template>
  <section class="view">
    <div v-if="booting" class="muted pad">Loading…</div>
    <div v-else-if="error" class="pad">
      <p class="err">{{ error }}</p>
      <button @click="load">Retry</button>
    </div>

    <template v-else-if="ticket">
      <header class="row head">
        <button class="ghost" @click="router.back()">← Back</button>
        <span class="spacer" />
        <button v-if="mode === 'preview'" class="ghost" @click="exportTicket">Export…</button>
        <button v-if="mode === 'preview'" class="ghost" @click="startEdit">Edit</button>
        <button v-if="mode === 'preview'" class="ghost danger" @click="remove">Delete</button>
      </header>

      <div class="card block">
        <template v-if="mode === 'preview'">
          <div class="title-row">
            <span class="card-id">{{ ticket.id }}</span>
            <h2>{{ ticket.title }}</h2>
          </div>

          <div class="meta row">
            <span class="type-badge" :style="{ color: `var(--type-${ticket.type})` }">{{
              TYPE_LABELS[ticket.type]
            }}</span>
            <span class="status-pill" :style="statusPillStyle(ticket)">{{
              STATUS_LABELS[ticket.status]
            }}</span>
            <span class="priority" :style="{ color: `var(--p-${ticket.priority})` }">{{
              PRIORITY_LABELS[ticket.priority]
            }}</span>
            <span v-if="ticket.due" class="due">Due {{ formatDate(ticket.due) }}</span>
          </div>

          <div v-if="ticket.parent" class="parent-row">
            <span class="section-label">Parent</span>
            <a href="#" class="link-row" @click.prevent="goTo(ticket.parent)">
              <span class="card-id">{{ ticket.parent }}</span>
              <span v-if="parentTicket">{{ parentTicket.title }}</span>
              <span v-if="parentTicket" class="dim">· {{ parentTicket.project }}</span>
            </a>
          </div>

          <div v-if="ticket.labels.length" class="labels">
            <span v-for="l in ticket.labels" :key="l" class="label">{{ l }}</span>
          </div>

          <div v-if="ticket.urls.length" class="urls">
            <span class="section-label">URLs</span>
            <ul>
              <li v-for="u in ticket.urls" :key="u">
                <a href="#" @click.prevent="openUrl(u)">{{ u }}</a>
              </li>
            </ul>
          </div>

          <div class="description">
            <span class="section-label">Description</span>
            <MarkdownView :source="ticket.description" :project="ticket.project" :ticket-id="ticket.id" />
          </div>

          <div v-if="children.length" class="subtasks">
            <span class="section-label">Sub-tasks ({{ children.length }})</span>
            <ul>
              <li v-for="c in children" :key="c.id">
                <a href="#" class="link-row" @click.prevent="goTo(c.id)">
                  <span class="card-id">{{ c.id }}</span>
                  <span class="st-title">{{ c.title }}</span>
                  <span class="dim">· {{ c.project }}</span>
                  <span class="status-pill" :style="statusPillStyle(c)">{{
                    STATUS_LABELS[c.status]
                  }}</span>
                </a>
              </li>
            </ul>
          </div>
        </template>

        <template v-else-if="form">
          <TicketForm
            v-model="form"
            :project="ticket.project"
            :ticket-id="ticket.id"
            :has-children="children.length > 0"
            @attached="onAttachmentsUpdated"
          />

          <AttachmentList :ticket="ticket" @updated="onAttachmentsUpdated" />

          <p v-if="saveError" class="err">{{ saveError }}</p>

          <footer class="row">
            <span class="spacer" />
            <button type="button" class="ghost" @click="cancelEdit">Cancel</button>
            <button type="button" class="primary" :disabled="saving" @click="save">
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </footer>
        </template>
      </div>
    </template>
  </section>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 780px;
}
.head {
  gap: 8px;
}
.block {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.title-row h2 {
  margin: 0;
}
.card-id {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-faint);
}
.meta {
  gap: 12px;
}
.status-pill {
  font-size: var(--fs-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  display: inline-block;
}
.priority {
  font-size: var(--fs-sm);
  font-weight: 600;
}
.type-badge {
  font-size: var(--fs-2xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.parent-row .link-row,
.subtasks .link-row {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  text-decoration: none;
  color: var(--text);
}
.parent-row .link-row:hover,
.subtasks .link-row:hover {
  text-decoration: underline;
}
.subtasks ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.subtasks .st-title {
  font-size: 12.5px;
}
.dim {
  color: var(--text-faint);
  font-size: var(--fs-sm);
}
.due {
  color: var(--text-faint);
  font-size: var(--fs-sm);
}
.labels {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.section-label {
  display: block;
  font-size: 10.5px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--text-faint);
  font-weight: 600;
  margin-bottom: 6px;
}
.urls ul {
  margin: 0;
  padding-left: 1.2em;
}
.urls li {
  font-size: 12.5px;
}
.pad {
  padding: 24px 0;
}
.err {
  color: var(--danger);
}
.danger {
  color: var(--danger);
}
</style>
