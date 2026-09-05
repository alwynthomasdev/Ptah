<script setup lang="ts">
/**
 * Single-select picker for a ticket's parent. Lists every live ticket (all
 * projects — the tickets store already holds them), minus the ticket itself and
 * any ticket that is already a sub-task (nesting is two levels deep). Epics are
 * listed first. `''` means "no parent".
 */
import { computed, nextTick, ref, watch } from 'vue';
import { TYPE_LABELS } from '@models/Ticket';
import { useTicketsStore } from '../stores/tickets';

const model = defineModel<string>({ required: true });
const props = defineProps<{
  /** The ticket being edited, excluded from the candidate list. */
  selfId?: string | null;
  /** Disable the control (e.g. this ticket already has sub-tasks). */
  disabled?: boolean;
  disabledReason?: string;
}>();

const tickets = useTicketsStore();
const open = ref(false);
const search = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

const candidates = computed(() =>
  [...tickets.items]
    .filter((t) => t.id !== props.selfId && t.parent == null)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'epic' ? -1 : 1;
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    }),
);

const visible = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return candidates.value;
  return candidates.value.filter(
    (t) => t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q),
  );
});

const currentLabel = computed(() => {
  if (!model.value) return 'No parent';
  const t = tickets.items.find((x) => x.id === model.value);
  return t ? `${t.id} — ${t.title}` : model.value;
});

watch(open, (isOpen) => {
  if (isOpen) nextTick(() => searchInput.value?.focus());
  else search.value = '';
});

function pick(id: string) {
  model.value = id;
  open.value = false;
}
</script>

<template>
  <div class="parent-picker">
    <button
      type="button"
      class="field"
      :class="{ on: model, disabled }"
      :disabled="disabled"
      :title="disabled ? disabledReason : undefined"
      @click="open = !open"
    >
      <span class="val">{{ disabled ? (disabledReason ?? currentLabel) : currentLabel }}</span>
      <span v-if="!disabled" class="caret">▾</span>
    </button>

    <template v-if="open && !disabled">
      <div class="backdrop" @click="open = false" />
      <div class="popover">
        <input
          ref="searchInput"
          v-model="search"
          type="text"
          class="search"
          placeholder="Search tickets…"
        />
        <button type="button" class="opt" :class="{ sel: !model }" @click="pick('')">
          No parent
        </button>
        <button
          v-for="t in visible"
          :key="t.id"
          type="button"
          class="opt"
          :class="{ sel: model === t.id }"
          @click="pick(t.id)"
        >
          <span class="opt-id">{{ t.id }}</span>
          <span class="opt-title">{{ t.title }}</span>
          <span class="opt-tag" :style="{ color: `var(--type-${t.type})` }">{{
            TYPE_LABELS[t.type]
          }}</span>
        </button>
        <p v-if="visible.length === 0" class="opt none">No matching tickets</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.parent-picker {
  position: relative;
}
.field {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-size: var(--fs-sm);
  cursor: pointer;
  text-align: left;
}
.field:hover:not(.disabled) {
  border-color: var(--text-faint);
}
.field.on {
  border-color: var(--accent);
}
.field.disabled {
  cursor: default;
  color: var(--text-faint);
  opacity: var(--opacity-disabled);
}
.val {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.caret {
  font-size: 9px;
  color: var(--text-faint);
}
.backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-dropdown);
}
.popover {
  position: absolute;
  z-index: calc(var(--z-dropdown) + 1);
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 280px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.search {
  width: 100%;
  padding: 5px 6px;
  margin-bottom: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font-size: var(--fs-sm);
}
.search:focus {
  outline: none;
  border-color: var(--accent);
}
.opt {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 5px 6px;
  font-size: var(--fs-sm);
  color: var(--text-dim);
  cursor: pointer;
  border-radius: var(--radius-sm);
  background: none;
  border: none;
  text-align: left;
  width: 100%;
}
.opt:hover {
  background: var(--surface-2);
  color: var(--text);
}
.opt.sel {
  color: var(--text);
  font-weight: 600;
}
.opt-id {
  font-family: var(--mono);
  font-size: var(--fs-xs);
  color: var(--text-faint);
  flex-shrink: 0;
}
.opt-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.opt-tag {
  font-size: var(--fs-2xs);
  flex-shrink: 0;
}
.opt.none {
  color: var(--text-faint);
  cursor: default;
}
.opt.none:hover {
  background: transparent;
}
</style>
