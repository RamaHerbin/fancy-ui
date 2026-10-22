<script setup lang="ts">
// Mirrors the direct render of $lib/fancy-ui/toggle (Toggle, label "Bold") in DemoRenderer.svelte.
import { Toggle } from "fancy-ui-vue";
</script>

<template>
	<Toggle label="Bold">
		<span class="font-bold">B</span>
	</Toggle>
</template>
