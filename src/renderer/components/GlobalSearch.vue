<script setup lang="ts">
/**
 * The shared search field in the top bar. Bound to the `search` store so the
 * `/search` view stays in sync. Typing navigates to `/search`; `App.vue` calls
 * `focus()` for the Ctrl/Cmd+K (or `/`) shortcut.
 */
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSearchStore } from '../stores/search';

const search = useSearchStore();
const route = useRoute();
const router = useRouter();
const input = ref<HTMLInputElement | null>(null);

const query = computed({
  get: () => search.query,
  set: (value: string) => {
    search.setQuery(value);
    if (value.trim() && route.name !== 'search') void router.push({ name: 'search' });
  },
});

function onEnter() {
  if (route.name !== 'search') void router.push({ name: 'search' });
}

defineExpose({
  focus: () => {
    input.value?.focus();
    input.value?.select();
  },
});
</script>

<template>
  <div class="global-search">
    <span class="icon" aria-hidden="true">⌕</span>
    <input
      ref="input"
      v-model="query"
      type="search"
      class="field"
      placeholder="Search tickets and notes…"
      aria-label="Search tickets and notes"
      @keydown.enter="onEnter"
    />
  </div>
</template>

<style scoped>
.global-search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  max-width: 480px;
}
.icon {
  position: absolute;
  left: 10px;
  color: var(--text-faint);
  font-size: 13px;
  pointer-events: none;
}
.field {
  width: 100%;
  padding: 6px 10px 6px 28px;
  font-size: 12.5px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  color: var(--text);
}
.field:focus {
  border-color: var(--accent);
  outline: none;
}
</style>
