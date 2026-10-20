<script setup lang="ts">
// Mirrors the direct render of $lib/fancy-ui/terminal-text (TerminalText, lines) in DemoRenderer.svelte.
import { TerminalText } from "fancy-ui-vue";
</script>

<template>
	<TerminalText :lines="['$ npm install fancy-ui', 'Installing...', 'Done!']" />
</template>
