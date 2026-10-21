<script lang="ts">
	import { onMount } from "svelte";
	import { markFound } from "../discovery.svelte.js";
	import { eggRuntime } from "../runtime.svelte.js";
	import AboutWindow from "./AboutWindow.svelte";

	let { onclose }: { onclose: () => void } = $props();

	let menu: HTMLDivElement | undefined = $state();
	let about = $state(false);

	const items = () => [...(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

	onMount(() => {
		items()[0]?.focus();
	});

	function onkeydown(e: KeyboardEvent) {
		const list = items();
		const at = list.indexOf(document.activeElement as HTMLElement);
		let next = -1;
		if (e.key === "ArrowDown") next = (at + 1) % list.length;
		else if (e.key === "ArrowUp") next = (at - 1 + list.length) % list.length;
		else if (e.key === "Home") next = 0;
		else if (e.key === "End") next = list.length - 1;
		else if (e.key === "Escape") {
			e.preventDefault();
			onclose();
			return;
		}
		if (next < 0) return;
		e.preventDefault();
		list[next]?.focus();
	}

	function openAbout() {
		markFound("retro");
		about = true;
	}

	function shutDown() {
		onclose();
		void eggRuntime.trigger("retro");
	}
</script>

<!-- Focusable (not tabbable) so a click on its padding keeps focus inside the
     taskbar's Start wrapper, whose focusout closes the menu. -->
<div class="retro-start-pop" tabindex="-1">
	{#if about}
		<AboutWindow {onclose} />
	{:else}
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div
			bind:this={menu}
			id="retro-start-menu"
			class="retro-start-menu"
			role="menu"
			aria-label="Start"
			{onkeydown}
		>
			<button type="button" role="menuitem" tabindex="-1" onclick={openAbout}>
				About FancyUI…
			</button>
			<div class="retro-start-sep" role="separator"></div>
			<button type="button" role="menuitem" tabindex="-1" onclick={shutDown}>Shut down…</button>
		</div>
	{/if}
</div>
