<script setup lang="ts">
import { ref } from 'vue';
import type { Project } from '@models/Project';
import { useProjectsStore } from '../stores/projects';
import { useTicketsStore } from '../stores/tickets';

const props = defineProps<{ projects: Project[]; active: string | null }>();
const emit = defineEmits<{ change: [key: string | null]; created: [] }>();

const store = useProjectsStore();
const tickets = useTicketsStore();

function countFor(key: string): number {
  return tickets.items.filter((t) => t.project === key).length;
}

const adding = ref(false);
const key = ref('');
const name = ref('');
const error = ref<string | null>(null);

/* Cycle a few token colours so each project gets a stable dot. */
const DOT_TOKENS = ['--accent', '--scheduled', '--done', '--paused', '--archive', '--p-high'];
function dotColor(index: number): string {
  return `var(${DOT_TOKENS[index % DOT_TOKENS.length]})`;
}

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
    <div
      v-if="props.projects.length > 1"
      class="side-item"
      :class="{ active: !props.active }"
      @click="emit('change', null)"
    >
      <span class="proj-dot all" />
      <span class="name">All projects</span>
      <span class="count">{{ tickets.items.length }}</span>
    </div>

    <div
      v-for="(p, i) in props.projects"
      :key="p.key"
      class="side-item"
      :class="{ active: p.key === props.active }"
      @click="emit('change', p.key)"
    >
      <span class="proj-dot" :style="{ background: dotColor(i) }" />
      <span class="name">{{ p.name }}</span>
      <span class="count">{{ countFor(p.key) }}</span>
    </div>

    <div v-if="props.projects.length === 0" class="side-item empty">No projects yet</div>

    <div v-if="!adding" class="side-item faint" @click="adding = true">+ Add project</div>
    <form v-else class="add" @submit.prevent="submit">
      <input v-model="key" placeholder="KEY" maxlength="10" required />
      <input v-model="name" placeholder="Name" required />
      <div class="add-actions">
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
  gap: 1px;
}
.side-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 5px;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 13px;
}
.side-item:hover {
  background: var(--surface-2);
  color: var(--text);
}
.side-item.active {
  background: var(--surface-2);
  color: var(--text);
  font-weight: 600;
}
.side-item.faint {
  color: var(--text-faint);
}
.side-item.empty {
  color: var(--text-faint);
  cursor: default;
}
.side-item.empty:hover {
  background: transparent;
}
.proj-dot {
  width: 7px;
  height: 7px;
  border-radius: 2px;
  flex-shrink: 0;
}
.proj-dot.all {
  background: linear-gradient(135deg, var(--scheduled), var(--done));
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.count {
  margin-left: auto;
  color: var(--text-faint);
  font-size: 11px;
  font-family: var(--mono);
}
.add {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 8px;
}
.add-actions {
  display: flex;
  gap: 6px;
}
.small {
  padding: 3px 8px;
  font-size: 12px;
}
.err {
  color: var(--danger);
  font-size: 12px;
  margin: 0;
}
</style>
