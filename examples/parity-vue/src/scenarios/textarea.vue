<script setup lang="ts">
// Mirrors the direct render of $lib/fancy-ui/textarea (Textarea, label + placeholder) in DemoRenderer.svelte.
import { Textarea } from "fancy-ui-vue";
</script>

<template>
	<div class="w-full max-w-sm px-6">
		<Textarea label="Message" placeholder="Tell us what you think…" />
	</div>
</template>
