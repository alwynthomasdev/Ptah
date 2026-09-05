<script setup lang="ts">
/**
 * Shared field markup for creating/editing a ticket: title, status, priority,
 * due date, labels, URLs, and the Markdown description. Bound to a single
 * reactive form object owned by the parent (create dialog or the ticket
 * page's edit mode) via `v-model`. No submit button — the parent owns
 * Save/Cancel/etc.
 */
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  TICKET_TYPES,
  TYPE_LABELS,
} from '@models/Ticket';
import type { Ticket } from '@models/Ticket';
import type { TicketFormModel } from '../lib/ticketForm';
import { useProjectsStore } from '../stores/projects';
import MarkdownEditor from './MarkdownEditor.vue';
import ParentPicker from './ParentPicker.vue';

const model = defineModel<TicketFormModel>({ required: true });
const projects = useProjectsStore();

const props = defineProps<{
  project?: string | null;
  ticketId?: string | null;
  /** This ticket already has sub-tasks, so it can't itself be given a parent. */
  hasChildren?: boolean;
}>();
const emit = defineEmits<{ attached: [ticket: Ticket] }>();
</script>

<template>
  <div class="ticket-form">
    <label
      >Title
      <input v-model="model.title" required autofocus />
    </label>

    <div class="grid">
      <label
        >Type
        <select v-model="model.type">
          <option v-for="t in TICKET_TYPES" :key="t" :value="t">{{ TYPE_LABELS[t] }}</option>
        </select>
      </label>
      <label
        >Status
        <select v-model="model.status">
          <option v-for="s in STATUSES" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
        </select>
      </label>
      <label
        >Priority
        <select v-model="model.priority">
          <option v-for="p in PRIORITIES" :key="p" :value="p">{{ PRIORITY_LABELS[p] }}</option>
        </select>
      </label>
      <label
        >Due date
        <input v-model="model.due" type="date" />
      </label>
      <label
        >Project
        <select v-model="model.project">
          <option v-for="p in projects.orderedItems" :key="p.key" :value="p.key">{{ p.name }}</option>
        </select>
      </label>
    </div>

    <label
      >Labels (comma separated)
      <input v-model="model.labels" placeholder="bug, ui, urgent" />
    </label>

    <label
      >URLs (one per line)
      <textarea v-model="model.urls" rows="3" placeholder="https://example.com/issue/123" />
    </label>

    <label
      >Parent
      <ParentPicker
        v-model="model.parent"
        :self-id="props.ticketId"
        :disabled="props.hasChildren"
        disabled-reason="This ticket has sub-tasks, so it can't also be a sub-task."
      />
    </label>

    <label class="md-field">
      <span>Description (Markdown)</span>
      <MarkdownEditor
        v-model="model.description"
        :project="project"
        :ticket-id="ticketId"
        @attached="emit('attached', $event)"
      />
    </label>
  </div>
</template>

<style scoped>
.ticket-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--text-dim);
}
label input,
label select,
label textarea {
  color: var(--text);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
</style>
