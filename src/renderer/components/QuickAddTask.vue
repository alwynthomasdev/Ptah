<script setup lang="ts">
import { ref } from 'vue';
import { DEFAULT_PROJECT_KEY } from '@models/Project';
import { useTicketsStore } from '../stores/tickets';

const tickets = useTicketsStore();

const title = ref('');
const submitting = ref(false);
const error = ref<string | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);

async function submit() {
  const trimmed = title.value.trim();
  if (!trimmed) return;

  error.value = null;
  submitting.value = true;
  try {
    await tickets.create({ title: trimmed, project: DEFAULT_PROJECT_KEY });
    title.value = '';
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    submitting.value = false;
    inputEl.value?.focus();
  }
}
</script>

<template>
  <div class="quick-add">
    <form class="add" @submit.prevent="submit">
      <input
        ref="inputEl"
        v-model="title"
        placeholder="Quick add task…"
        :disabled="submitting"
        aria-label="Quick add task"
      />
    </form>
    <p v-if="error" class="err">{{ error }}</p>
  </div>
</template>

<style scoped>
.quick-add {
  margin-bottom: 20px;
}
.add {
  padding: 0 8px;
}
.add input {
  width: 100%;
  font-size: 13px;
}
.err {
  color: var(--danger);
  font-size: var(--fs-sm);
  margin: 4px 8px 0;
}
</style>
