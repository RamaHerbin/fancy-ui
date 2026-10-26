<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/context-menu/BasicUsage.svelte.
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "fancy-ui-vue";
</script>

<template>
	<ContextMenu sound>
		<ContextMenuTrigger focusable>
			<div
				class="border-border text-muted-foreground flex h-[140px] w-full items-center justify-center rounded-[10px] border border-dashed text-[13px]"
			>
				Right-click here
			</div>
		</ContextMenuTrigger>
		<ContextMenuContent>
			<ContextMenuItem :on-select="() => console.log('back')">Previous</ContextMenuItem>
			<ContextMenuItem :on-select="() => console.log('forward')">Next</ContextMenuItem>
			<ContextMenuItem :on-select="() => console.log('reload')">Reload</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem :on-select="() => console.log('save')">Save page…</ContextMenuItem>
		</ContextMenuContent>
	</ContextMenu>
</template>
