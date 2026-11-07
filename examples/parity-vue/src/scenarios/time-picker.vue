<script setup lang="ts">
// Mirrors the direct render of $lib/fancy-ui/time-picker (TimePicker, label + placeholder) in DemoRenderer.svelte.
import { TimePicker } from "fancy-ui-vue";
</script>

<template>
	<div class="w-full max-w-sm px-6 pb-56">
		<TimePicker label="Time" placeholder="Pick a time" />
	</div>
</template>
