<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/switch/BasicUsage.svelte.
import { ref } from "vue";
import { Switch } from "fancy-ui-vue";

const notifications = ref(false);
</script>

<template>
	<Switch sound v-model:checked="notifications" label="Notifications" />
</template>
