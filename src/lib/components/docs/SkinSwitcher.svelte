<script lang="ts">
	import { createSkinState, t } from "$lib/stores";
	import type { DocsSkin } from "$lib/stores";

	const skinState = createSkinState();

	let open = $state(false);
	let selectedIndex = $state(0);

	type Entry = { name: DocsSkin; label: string };

	const entries = $derived<Entry[]>([
		{ name: "standard", label: t("skin.standard") },
		{ name: "brutal", label: t("skin.brutal") },
		{ name: "retro-os", label: t("skin.retroOs") },
	]);

	const activeName = $derived(skinState.skin);

	const activeLabel = $derived(entries.find((e) => e.name === activeName)?.label ?? "");

	function pick(name: DocsSkin) {
		skinState.setSkin(name);
		open = false;
	}

	function toggle() {
		open = !open;
		if (open)
			selectedIndex = Math.max(
				0,
				entries.findIndex((e) => e.name === activeName)
			);
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === "Escape") {
			open = false;
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, entries.length - 1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === "Enter") {
			e.preventDefault();
			pick(entries[selectedIndex].name);
		}
	}

	function onWindowClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (open && !target.closest("[data-skin-switcher]")) open = false;
	}
</script>

{#snippet swatch(name: DocsSkin)}
	{#if name === "standard"}
		<span class="size-2.5 rounded-[3px] border-[1.5px] border-current bg-transparent"></span>
	{:else if name === "brutal"}
		<span class="size-2.5 rounded-[3px] border-[1.5px] border-current bg-[#F5B40C]"></span>
	{:else}
		<span
			class="grid size-2.5 shrink-0 grid-cols-2 grid-rows-2 gap-px bg-[#191308] p-px"
			aria-hidden="true"
		>
			<span class="bg-[#B8912B]"></span>
			<span class="bg-[#A0442F]"></span>
			<span class="bg-[#3F62A7]"></span>
			<span class="bg-[#3A6B42]"></span>
		</span>
	{/if}
{/snippet}

<svelte:window onkeydown={onWindowKeydown} onclick={onWindowClick} />

<div class="relative" data-skin-switcher>
	<button
		type="button"
		onclick={toggle}
		aria-label={t("a11y.changeSkin")}
		aria-haspopup="menu"
		aria-expanded={open}
		class="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-9 items-center gap-1.5 rounded-md border px-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
	>
		{@render swatch(activeName)}
		<span class="font-mono text-[10px] font-bold tracking-widest uppercase">{activeLabel}</span>
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="text-muted-foreground"
			aria-hidden="true"
		>
			<path d="m6 9 6 6 6-6" />
		</svg>
	</button>

	{#if open}
		<div
			class="bg-popover border-border absolute right-0 z-[60] mt-1 max-h-80 w-40 overflow-y-auto rounded-lg border p-1.5 shadow-lg"
			role="menu"
			aria-label={t("skin.heading")}
		>
			<p class="text-muted-foreground px-2 py-1.5 text-xs font-semibold tracking-wider uppercase">
				{t("skin.heading")}
			</p>
			{#each entries as entry, i}
				<button
					type="button"
					role="menuitemradio"
					aria-checked={entry.name === activeName}
					onclick={() => pick(entry.name)}
					onmouseenter={() => (selectedIndex = i)}
					class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors {i ===
					selectedIndex
						? 'bg-accent text-accent-foreground'
						: 'text-foreground'}"
				>
					{@render swatch(entry.name)}
					<span class="flex-1 text-left">{entry.label}</span>
					{#if entry.name === activeName}
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							aria-hidden="true"
						>
							<path d="M20 6 9 17l-5-5" />
						</svg>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
