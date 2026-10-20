<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/dropdown-menu/BasicUsage.svelte.
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "fancy-ui-vue";
</script>

<template>
	<DropdownMenu sound>
		<DropdownMenuTrigger>Options</DropdownMenuTrigger>
		<DropdownMenuContent>
			<DropdownMenuItem :on-select="() => console.log('rename')">Rename</DropdownMenuItem>
			<DropdownMenuItem :on-select="() => console.log('duplicate')">Duplicate</DropdownMenuItem>
			<DropdownMenuItem :on-select="() => console.log('share')">Share…</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem variant="destructive" :on-select="() => console.log('delete')">
				Delete
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
</template>
