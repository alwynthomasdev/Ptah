<script setup lang="ts">
import { ref } from 'vue';
import type { Project } from '@models/Project';
import { useProjectsStore } from '../stores/projects';

defineProps<{ projects: Project[]; active: string | null }>();
const emit = defineEmits<{ change: [key: string | null]; created: [] }>();

const store = useProjectsStore();
const adding = ref(false);
const key = ref('');
const name = ref('');
const error = ref<string | null>(null);

async function submit() {
  error.value = null;
  try {
    await store.create({ key: key.value, name: name.value });
    key.value = '';
    name.value = '';
    adding.value = false;
    emit('created');
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}
</script>

<template>
  <div class="picker">
    <label class="muted">Project</label>
    <select
      :value="active ?? ''"
      @change="emit('change', ($event.target as HTMLSelectElement).value || null)"
    >
      <option v-if="projects.length === 0" value="">No projects yet</option>
      <option v-for="p in projects" :key="p.key" :value="p.key">{{ p.key }} — {{ p.name }}</option>
    </select>

    <button v-if="!adding" class="ghost small" @click="adding = true">+ Add project</button>
    <form v-else class="add" @submit.prevent="submit">
      <input v-model="key" placeholder="KEY" maxlength="10" required />
      <input v-model="name" placeholder="Name" required />
      <div class="row">
        <button type="submit" class="primary small">Create</button>
        <button type="button" class="ghost small" @click="adding = false">Cancel</button>
      </div>
      <p v-if="error" class="err">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
select {
  width: 100%;
}
.small {
  padding: 3px 8px;
  font-size: 12px;
}
.add {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.err {
  color: var(--danger);
  font-size: 12px;
  margin: 0;
}
</style>
