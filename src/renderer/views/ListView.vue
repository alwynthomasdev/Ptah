<script setup lang="ts">
import TicketBrowser from '../components/TicketBrowser.vue';
const emit = defineEmits<{ changed: [] }>();
</script>

<template>
  <TicketBrowser
    scope="working"
    variant="list"
    empty="No tickets in this project yet. Use “+ New ticket”."
    @changed="emit('changed')"
  />
</template>
