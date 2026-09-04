<script setup lang="ts">
/**
 * Add / remove / open a ticket's file attachments. Every action hits the disk
 * immediately (independent of the ticket form's Save) and emits the refreshed
 * ticket so the parent can keep the store in sync.
 */
import { ref } from 'vue';
import type { Ticket } from '@models/Ticket';
import { call, ptah } from '../api';

const props = defineProps<{ ticket: Ticket }>();
const emit = defineEmits<{ updated: [ticket: Ticket] }>();

const busy = ref(false);
const error = ref<string | null>(null);

async function run(fn: () => Promise<Ticket | void>) {
  busy.value = true;
  error.value = null;
  try {
    const t = await fn();
    if (t) emit('updated', t);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

const add = () => run(() => call(ptah.attachments.add(props.ticket.id)));
const remove = (name: string) => {
  if (!confirm(`Remove attachment "${name}"?`)) return;
  return run(() => call(ptah.attachments.remove(props.ticket.id, name)));
};
const open = (name: string) => run(() => call(ptah.attachments.open(props.ticket.id, name)));
const reveal = (name: string) => run(() => call(ptah.attachments.reveal(props.ticket.id, name)));
</script>

<template>
  <div class="attachments">
    <div class="head">
      <span>Attachments</span>
      <button type="button" class="ghost small" :disabled="busy" @click="add">Add files…</button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>

    <ul v-if="ticket.attachments.length" class="files">
      <li v-for="name in ticket.attachments" :key="name">
        <span class="fname">{{ name }}</span>
        <span class="spacer" />
        <button type="button" class="ghost small" :disabled="busy" @click="open(name)">Open</button>
        <button type="button" class="ghost small" :disabled="busy" @click="reveal(name)">
          Reveal
        </button>
        <button type="button" class="ghost small danger" :disabled="busy" @click="remove(name)">
          Remove
        </button>
      </li>
    </ul>
    <p v-else class="muted small">No attachments.</p>
  </div>
</template>

<style scoped>
.attachments {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-dim);
}
.spacer {
  flex: 1;
}
.small {
  padding: 3px 8px;
  font-size: 12px;
}
.files {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.files li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
}
.fname {
  font-size: 12.5px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.danger {
  color: var(--danger);
}
.err {
  color: var(--danger);
  font-size: 12px;
  margin: 0;
}
.small {
  font-size: 12px;
}
</style>
