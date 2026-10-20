<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/button-group/BasicUsage.svelte.
import { Button, ButtonGroup } from "fancy-ui-vue";
</script>

<template>
	<ButtonGroup label="Clipboard actions">
		<Button variant="outline">Cut</Button>
		<Button variant="outline">Copy</Button>
		<Button variant="outline">Paste</Button>
	</ButtonGroup>
</template>
