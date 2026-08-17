<!--
	The landing page's skin control.

	Deliberately NOT `docs/SkinSwitcher.svelte`: that one is a dropdown wired to
	the docs store, which knows three skins and persists to localStorage. This is
	a segmented control over whatever list it is handed, owned by the page, and
	persists nothing — see the note in src/routes/+page.svelte.

	Pills at md and up; a native <select> below, which buys correct mobile
	behaviour and keyboard support without a second popup implementation.
-->
<script lang="ts">
	import type { Skin } from "$lib/cameleon";

	interface Props {
		skins: Skin[];
		value: Skin;
	}

	let { skins, value = $bindable() }: Props = $props();

	let groupEl = $state<HTMLDivElement | null>(null);

	const activeIndex = $derived(skins.findIndex((s) => s.name === value.name));

	function select(index: number, focus = false) {
		const next = skins[(index + skins.length) % skins.length];
		if (!next) return;
		value = next;
		if (focus) {
			// Roving tabindex: the newly checked pill becomes the tab stop, so move
			// focus with the selection or the ring is left behind on the old one.
			const pills = groupEl?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
			pills?.[(index + skins.length) % skins.length]?.focus();
		}
	}

	function onkeydown(event: KeyboardEvent) {
		const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
		if (step) {
			event.preventDefault();
			select(activeIndex + step, true);
			return;
		}
		if (event.key === "Home") {
			event.preventDefault();
			select(0, true);
		} else if (event.key === "End") {
			event.preventDefault();
			select(skins.length - 1, true);
		}
	}
</script>

<!-- Pills -->
<div
	bind:this={groupEl}
	role="radiogroup"
	aria-label="Skin"
	class="lp-line hidden items-center gap-0.5 rounded-full border p-[3px] md:inline-flex"
>
	{#each skins as skin, index (skin.name)}
		{@const checked = skin.name === value.name}
		<button
			type="button"
			role="radio"
			aria-checked={checked}
			tabindex={checked ? 0 : -1}
			onclick={() => select(index)}
			{onkeydown}
			class="cursor-pointer rounded-full px-3 py-[5px] text-[12px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
			class:lp-muted={!checked}
			style={checked
				? "background:var(--skin-page-fg,#f8fafc);color:var(--skin-page-bg,#050508)"
				: undefined}
		>
			{skin.label}
		</button>
	{/each}
</div>

<!-- Compact control below md -->
<label class="md:hidden">
	<span class="sr-only">Skin</span>
	<select
		class="lp-line lp-surface cursor-pointer rounded-lg border px-2.5 py-[7px] text-[12px] font-medium"
		style="color:var(--skin-page-fg,#f8fafc)"
		value={value.name}
		onchange={(event) => {
			const found = skins.find((s) => s.name === event.currentTarget.value);
			if (found) value = found;
		}}
	>
		{#each skins as skin (skin.name)}
			<option value={skin.name}>{skin.label}</option>
		{/each}
	</select>
</label>
