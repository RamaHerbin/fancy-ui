<!--
  InlineTextEditor — contenteditable overlay for _text blocks.
  Renders the same tag/class as the Text primitive but with contenteditable.
  On blur or Escape → commits text. On Enter for heading tags → commits.
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { cn } from "$lib/utils";
	import { getEditorState } from "../stores/editor.svelte.js";

	interface Props {
		blockId: string;
		content?: string;
		tag?: string;
		class?: string;
	}

	let { blockId, content = "", tag = "p", class: className = "" }: Props = $props();

	const ALLOWED_TAGS = ["h1", "h2", "h3", "h4", "p", "span"];
	const safeTag = $derived(ALLOWED_TAGS.includes(tag) ? tag : "p");

	const editor = getEditorState();
	let el = $state<HTMLElement | null>(null);

	const isHeading = $derived(safeTag.startsWith("h"));
	const editableClass = $derived(
		cn(className, "outline-none ring-2 ring-primary/50 rounded-sm cursor-text")
	);

	onMount(() => {
		if (el) {
			el.textContent = content;
			el.focus();
			// Place cursor at end
			const range = document.createRange();
			range.selectNodeContents(el);
			range.collapse(false);
			const sel = window.getSelection();
			sel?.removeAllRanges();
			sel?.addRange(range);
		}
	});

	function commit() {
		if (!el) return;
		const text = el.textContent ?? "";
		editor.updateBlockProp(blockId, "content", text);
		editor.stopInlineEdit();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			e.preventDefault();
			commit();
		} else if (e.key === "Enter" && isHeading) {
			e.preventDefault();
			commit();
		}
	}

	function handleBlur() {
		commit();
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		const text = e.clipboardData?.getData("text/plain") ?? "";
		if (!el || !text) return;

		const selection = window.getSelection();
		if (!selection) return;

		let range: Range;
		if (selection.rangeCount > 0 && el.contains(selection.getRangeAt(0).commonAncestorContainer)) {
			range = selection.getRangeAt(0);
		} else {
			range = document.createRange();
			range.selectNodeContents(el);
			range.collapse(false);
		}

		range.deleteContents();
		const textNode = document.createTextNode(text);
		range.insertNode(textNode);
		range.setStartAfter(textNode);
		range.collapse(true);
		selection.removeAllRanges();
		selection.addRange(range);
	}
</script>

<!-- svelte-ignore a11y_missing_content -->
<svelte:element
	this={safeTag}
	bind:this={el}
	class={editableClass}
	contenteditable="plaintext-only"
	role="textbox"
	tabindex="0"
	aria-label="Inline text editor"
	aria-multiline={isHeading ? "false" : "true"}
	onkeydown={handleKeydown}
	onblur={handleBlur}
	onpaste={handlePaste}
/>
