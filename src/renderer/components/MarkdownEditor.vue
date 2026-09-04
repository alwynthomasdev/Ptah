<script setup lang="ts">
/**
 * Description editor with a Write / Preview toggle. Write is a plain textarea;
 * Preview renders the current value through `MarkdownView`.
 */
import { ref } from 'vue';
import MarkdownView from './MarkdownView.vue';

defineProps<{
  modelValue: string;
  project?: string | null;
  ticketId?: string | null;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const tab = ref<'write' | 'preview'>('write');

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <div class="md-editor">
    <div class="md-tabs">
      <button type="button" :class="{ active: tab === 'write' }" @click="tab = 'write'">Write</button>
      <button type="button" :class="{ active: tab === 'preview' }" @click="tab = 'preview'">
        Preview
      </button>
    </div>

    <textarea
      v-if="tab === 'write'"
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
</style>
