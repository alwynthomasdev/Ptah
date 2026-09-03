<script setup lang="ts">
import TicketBrowser from '../components/TicketBrowser.vue';
const emit = defineEmits<{ changed: [] }>();
</script>

<template>
  <TicketBrowser
    title="Backlog"
    scope="backlog"
    empty="Backlog is empty."
    @changed="emit('changed')"
  />
</template>
