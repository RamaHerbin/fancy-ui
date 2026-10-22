<script setup lang="ts">
// Parity variant for scripts/parity/states.mjs; mirrors
// src/routes/_parity/[slug]/variants/tooltip--long.svelte.
import { IconButton, Tooltip } from "fancy-ui-vue";
</script>

<template>
	<Tooltip
		content="Share this board with everyone in the workspace, including guests who were invited to a single project last month"
	>
		<IconButton label="Share" variant="outline">
			<svg
				class="size-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
				<path d="M16 6l-4-4-4 4" />
				<path d="M12 2v13" />
			</svg>
		</IconButton>
	</Tooltip>
</template>
