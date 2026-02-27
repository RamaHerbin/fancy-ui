<script lang="ts">
	import type { BuilderComponentMeta } from "../types/registry.js";
	import { getIcon } from "./IconMap.js";
	import { getEditorState } from "../stores/editor.svelte.js";
	import { DRAG_THRESHOLD } from "../utils/drag.js";

	interface Props {
		meta: BuilderComponentMeta;
		onpreview?: (meta: BuilderComponentMeta, rect: DOMRect) => void;
		onpreviewend?: () => void;
	}

	let { meta, onpreview, onpreviewend }: Props = $props();

	const editor = getEditorState();
	let Icon = $derived(getIcon(meta.icon));

	let buttonEl: HTMLButtonElement;
	let startX = 0;
	let startY = 0;
	let dragging = false;

	function handleMouseEnter() {
		if (buttonEl && onpreview) {
			onpreview(meta, buttonEl.getBoundingClientRect());
		}
	}

	function handleMouseLeave() {
		onpreviewend?.();
	}

	function handleClick() {
		const parentId =
			editor.selectedBlock && editor.selectedMeta?.acceptsChildren ? editor.selectedBlockId : null;
		editor.addBlock(meta.slug, parentId);
	}

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		startX = e.clientX;
		startY = e.clientY;
		dragging = false;
		document.addEventListener("pointermove", onPointerMove);
		document.addEventListener("pointerup", onPointerUp);
	}

	function onPointerMove(e: PointerEvent) {
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;

		if (!dragging && Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD) {
			dragging = true;
			onpreviewend?.();
			editor.startPaletteDrag(meta.slug);
		}

		if (dragging) {
			editor.updatePointer(e.clientX, e.clientY);
		}
	}

	function onPointerUp() {
		document.removeEventListener("pointermove", onPointerMove);
		document.removeEventListener("pointerup", onPointerUp);

		if (dragging) {
			editor.executeDrop();
			editor.endDrag();
		}

		dragging = false;
	}
</script>

<button
	bind:this={buttonEl}
	type="button"
	class="hover:bg-accent hover:text-accent-foreground flex w-full cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors select-none"
	style="touch-action: none;"
	data-testid="palette-item-{meta.slug}"
	onclick={handleClick}
	onpointerdown={onPointerDown}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	title={meta.description}
>
	<Icon class="text-muted-foreground h-4 w-4 shrink-0" />
	<span class="truncate">{meta.name}</span>
</button>
