<script setup lang="ts">
import TicketBrowser from '../components/TicketBrowser.vue';
const emit = defineEmits<{ changed: [] }>();
</script>

<template>
  <TicketBrowser
    title="Archive"
    scope="archive"
    empty="Nothing archived."
    @changed="emit('changed')"
  />
</template>
