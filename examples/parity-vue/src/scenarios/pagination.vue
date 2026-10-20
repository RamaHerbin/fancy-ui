<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/pagination/BasicUsage.svelte.
import { ref } from "vue";
import { Pagination } from "fancy-ui-vue";

const page = ref(1);
</script>

<template>
	<Pagination v-model:page="page" sound :count="12" />
</template>
