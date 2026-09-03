<script setup lang="ts">
/**
 * M1: read-only swimlane. Columns Scheduled → WIP → Done, with a Paused tray
 * beneath WIP. Drag-to-change-status and the full filter bar land in M2.
 */
import { computed, ref } from 'vue';
import type { Ticket } from '@models/Ticket';
import { useTicketsStore } from '../stores/tickets';
import TicketDialog from '../components/TicketDialog.vue';

const emit = defineEmits<{ changed: [] }>();
const tickets = useTicketsStore();
const editing = ref<Ticket | null>(null);

const cols = computed(() => ({
  scheduled: tickets.inStatus('scheduled'),
  wip: tickets.inStatus('wip'),
  paused: tickets.inStatus('paused'),
  done: tickets.inStatus('done'),
}));
</script>

<template>
  <section class="board">
    <div class="col">
      <header>
        Scheduled <span class="tag">{{ cols.scheduled.length }}</span>
      </header>
      <article v-for="t in cols.scheduled" :key="t.id" class="card tkt" @click="editing = t">
        <span class="dot" :style="{ background: `var(--prio-${t.priority})` }" />
        <div>
          <small class="muted">{{ t.id }}</small
          ><br />{{ t.title }}
        </div>
      </article>
    </div>

    <div class="col">
      <header>
        WIP <span class="tag">{{ cols.wip.length }}</span>
      </header>
      <article v-for="t in cols.wip" :key="t.id" class="card tkt" @click="editing = t">
        <span class="dot" :style="{ background: `var(--prio-${t.priority})` }" />
        <div>
          <small class="muted">{{ t.id }}</small
          ><br />{{ t.title }}
        </div>
      </article>

      <div class="paused">
        <header class="muted">
          Paused <span class="tag">{{ cols.paused.length }}</span>
        </header>
        <article v-for="t in cols.paused" :key="t.id" class="card tkt dim" @click="editing = t">
          <span class="dot" :style="{ background: `var(--prio-${t.priority})` }" />
          <div>
            <small class="muted">{{ t.id }}</small
            ><br />{{ t.title }}
          </div>
        </article>
      </div>
    </div>

    <div class="col">
      <header>
        Done <span class="tag">{{ cols.done.length }}</span>
      </header>
      <article v-for="t in cols.done" :key="t.id" class="card tkt" @click="editing = t">
        <span class="dot" :style="{ background: `var(--prio-${t.priority})` }" />
        <div>
          <small class="muted">{{ t.id }}</small
          ><br />{{ t.title }}
        </div>
      </article>
    </div>

    <TicketDialog
      v-if="editing"
      mode="edit"
      :ticket="editing"
      @close="editing = null"
      @saved="
        editing = null;
        emit('changed');
      "
    />
  </section>
</template>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 20px 24px;
  align-items: start;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.col > header {
  font-weight: 600;
}
.tkt {
  display: flex;
  gap: 8px;
  padding: 10px;
  cursor: pointer;
}
.tkt:hover {
  border-color: var(--accent);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  flex: none;
}
.dim {
  opacity: 0.7;
}
.paused {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
