<!--
  InlineTextEditor — contenteditable overlay for _text blocks.
  Renders the same tag/class as the Text primitive but with contenteditable.
  On blur or Escape → commits text. On Enter for heading tags → commits.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils';
	import { getEditorState } from '../stores/editor.svelte.js';

	interface Props {
		blockId: string;
		content?: string;
		tag?: string;
		class?: string;
	}

	let { blockId, content = '', tag = 'p', class: className = '' }: Props = $props();

	const editor = getEditorState();
	let el = $state<HTMLElement | null>(null);

	const isHeading = $derived(tag.startsWith('h'));
	const editableClass = $derived(
		cn(className, 'outline-none ring-2 ring-primary/50 rounded-sm cursor-text')
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
		const text = el.textContent ?? '';
		editor.updateBlockProp(blockId, 'content', text);
		editor.stopInlineEdit();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			commit();
		} else if (e.key === 'Enter' && isHeading) {
			e.preventDefault();
			commit();
		}
	}

	function handleBlur() {
		commit();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_missing_content -->
{#if tag === 'h1'}
	<h1
		bind:this={el}
		class={editableClass}
		contenteditable="true"
		onkeydown={handleKeydown}
		onblur={handleBlur}
	></h1>
{:else if tag === 'h2'}
	<h2
		bind:this={el}
		class={editableClass}
		contenteditable="true"
		onkeydown={handleKeydown}
		onblur={handleBlur}
	></h2>
{:else if tag === 'h3'}
	<h3
		bind:this={el}
		class={editableClass}
		contenteditable="true"
		onkeydown={handleKeydown}
		onblur={handleBlur}
	></h3>
{:else if tag === 'h4'}
	<h4
		bind:this={el}
		class={editableClass}
		contenteditable="true"
		onkeydown={handleKeydown}
		onblur={handleBlur}
	></h4>
{:else if tag === 'span'}
	<span
		bind:this={el}
		class={editableClass}
		contenteditable="true"
		onkeydown={handleKeydown}
		onblur={handleBlur}
	></span>
{:else}
	<p
		bind:this={el}
		class={editableClass}
		contenteditable="true"
		onkeydown={handleKeydown}
		onblur={handleBlur}
	></p>
{/if}
