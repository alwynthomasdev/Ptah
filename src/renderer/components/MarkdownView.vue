<script setup lang="ts">
/**
 * Renders a Markdown string as styled HTML. `http(s)` links are opened in the
 * OS browser via the main process; in-page `#anchor` links scroll locally.
 */
import { computed } from 'vue';
import { renderMarkdown } from '../lib/markdown';
import { ptah } from '../api';

const props = defineProps<{
  source: string;
  project?: string | null;
  ticketId?: string | null;
}>();

const html = computed(() =>
  renderMarkdown(props.source ?? '', {
    project: props.project ?? undefined,
    ticketId: props.ticketId ?? undefined,
  }),
);

function onClick(e: MouseEvent) {
  const link = (e.target as HTMLElement).closest('a');
  if (!link) return;
  const href = link.getAttribute('href') ?? '';
  if (/^https?:/i.test(href)) {
    e.preventDefault();
    void ptah.system.openExternal(href);
  } else if (href.startsWith('#')) {
    e.preventDefault();
    const el = document.getElementById(decodeURIComponent(href.slice(1)));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- markdown-it runs with html:false -->
  <div class="prose" @click="onClick" v-html="html" />
</template>

<style scoped>
.prose {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text);
  word-wrap: break-word;
}
.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3),
.prose :deep(h4) {
  margin: 1.2em 0 0.5em;
  line-height: 1.3;
  font-weight: 600;
}
.prose :deep(h1) {
  font-size: 1.5em;
}
.prose :deep(h2) {
  font-size: 1.3em;
}
.prose :deep(h3) {
  font-size: 1.12em;
}
.prose :deep(h4) {
  font-size: 1em;
  color: var(--text-dim);
}
.prose :deep(> :first-child) {
  margin-top: 0;
}
.prose :deep(p),
.prose :deep(ul),
.prose :deep(ol),
.prose :deep(blockquote),
.prose :deep(pre),
.prose :deep(table) {
  margin: 0 0 0.85em;
}
.prose :deep(ul),
.prose :deep(ol) {
  padding-left: 1.4em;
}
.prose :deep(li) {
  margin: 0.2em 0;
}
.prose :deep(a) {
  color: var(--accent);
  text-decoration: none;
}
.prose :deep(a:hover) {
  text-decoration: underline;
}
.prose :deep(img) {
  max-width: 100%;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.prose :deep(blockquote) {
  padding-left: 0.9em;
  border-left: 3px solid var(--border);
  color: var(--text-dim);
}
.prose :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1.2em 0;
}
.prose :deep(code) {
  font-family: var(--mono);
  font-size: 0.9em;
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 4px;
  padding: 0.08em 0.35em;
}
.prose :deep(pre) {
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 6px;
  padding: 10px 12px;
  overflow-x: auto;
}
.prose :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  color: var(--code-text);
}
.prose :deep(table) {
  border-collapse: collapse;
  display: block;
  overflow-x: auto;
}
.prose :deep(th),
.prose :deep(td) {
  border: 1px solid var(--border);
  padding: 5px 9px;
  text-align: left;
}
.prose :deep(th) {
  background: var(--surface-2);
}

/* Minimal, token-driven highlight.js theme (light + dark via tokens). */
.prose :deep(.hljs-comment),
.prose :deep(.hljs-quote) {
  color: var(--syntax-comment);
  font-style: italic;
}
.prose :deep(.hljs-keyword),
.prose :deep(.hljs-selector-tag),
.prose :deep(.hljs-built_in),
.prose :deep(.hljs-literal) {
  color: var(--syntax-keyword);
}
.prose :deep(.hljs-string),
.prose :deep(.hljs-regexp),
.prose :deep(.hljs-meta .hljs-string) {
  color: var(--syntax-string);
}
.prose :deep(.hljs-number),
.prose :deep(.hljs-bullet) {
  color: var(--syntax-number);
}
.prose :deep(.hljs-title),
.prose :deep(.hljs-title.class_),
.prose :deep(.hljs-title.function_),
.prose :deep(.hljs-section),
.prose :deep(.hljs-attr),
.prose :deep(.hljs-attribute),
.prose :deep(.hljs-name) {
  color: var(--syntax-name);
}
.prose :deep(.hljs-emphasis) {
  font-style: italic;
}
.prose :deep(.hljs-strong) {
  font-weight: 600;
}
</style>
