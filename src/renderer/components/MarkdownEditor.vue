<script setup lang="ts">
/**
 * Description editor with a Write / Preview toggle. Write is a plain textarea;
 * Preview renders the current value through `MarkdownView`. In Write mode, when
 * the editor knows its ticket id, an "Insert image/file" action attaches a file
 * to the ticket and drops a relative Markdown reference at the caret.
 */
import { nextTick, ref } from 'vue';
import type { Ticket } from '@models/Ticket';
import { call, ptah } from '../api';
import MarkdownView from './MarkdownView.vue';

const props = defineProps<{
  modelValue: string;
  project?: string | null;
  ticketId?: string | null;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
  /** Fired after a file is attached via "Insert image/file". */
  attached: [ticket: Ticket];
}>();

const tab = ref<'write' | 'preview'>('write');
const textarea = ref<HTMLTextAreaElement | null>(null);
const inserting = ref(false);
const error = ref<string | null>(null);

const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i;

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value);
}

function insertAtCursor(text: string) {
  const value = props.modelValue;
  const el = textarea.value;
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  emit('update:modelValue', value.slice(0, start) + text + value.slice(end));
  nextTick(() => {
    if (!el) return;
    el.focus();
    const pos = start + text.length;
    el.setSelectionRange(pos, pos);
  });
}

async function insertFiles() {
  if (!props.ticketId || inserting.value) return;
  inserting.value = true;
  error.value = null;
  try {
    const before = await call(ptah.tickets.get(props.ticketId));
    const after = await call(ptah.attachments.add(props.ticketId));
    emit('attached', after);
    const added = after.attachments.filter((f) => !before.attachments.includes(f));
    if (added.length) {
      const snippet = added
        .map((name) => (IMAGE_RE.test(name) ? `![${name}](${name})` : `[${name}](${name})`))
        .join('\n');
      insertAtCursor(snippet);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    inserting.value = false;
  }
}
</script>

<template>
  <div class="md-editor">
    <div class="md-bar">
      <div class="md-tabs">
        <button type="button" :class="{ active: tab === 'write' }" @click="tab = 'write'">
          Write
        </button>
        <button type="button" :class="{ active: tab === 'preview' }" @click="tab = 'preview'">
          Preview
        </button>
      </div>
      <button
        v-if="tab === 'write' && ticketId"
        type="button"
        class="ghost insert"
        :disabled="inserting"
        @click="insertFiles"
      >
        {{ inserting ? 'Attaching…' : 'Insert image/file' }}
      </button>
    </div>

    <p v-if="error" class="err">{{ error }}</p>

    <textarea
      v-if="tab === 'write'"
      ref="textarea"
      :value="modelValue"
      rows="12"
      spellcheck="true"
      @input="onInput"
    />
    <div v-else class="md-preview">
      <MarkdownView
        v-if="modelValue.trim()"
        :source="modelValue"
        :project="project"
        :ticket-id="ticketId"
      />
      <p v-else class="muted empty">Nothing to preview.</p>
    </div>
  </div>
</template>

<style scoped>
.md-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.md-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.md-tabs {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  align-self: flex-start;
}
.md-tabs button {
  border: none;
  border-radius: 0;
  background: var(--surface-2);
  color: var(--text-dim);
  font-size: 11.5px;
  padding: 4px 12px;
  cursor: pointer;
}
.md-tabs button:hover {
  color: var(--text);
}
.md-tabs button.active {
  background: var(--accent);
  color: var(--accent-contrast);
  font-weight: 600;
}
.md-tabs button + button {
  border-left: 1px solid var(--border);
}
.insert {
  font-size: 11.5px;
  padding: 4px 10px;
}
textarea {
  width: 100%;
  resize: vertical;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.5;
}
.md-preview {
  min-height: 120px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
}
.empty {
  margin: 0;
  font-size: 12px;
}
.err {
  color: var(--danger);
  font-size: 12px;
  margin: 0;
}
</style>
