<script lang="ts">
	import { createThemeState, t } from "$lib/stores";

	const themeState = createThemeState();

	let open = $state(false);
	let selectedIndex = $state(0);

	type Entry = { name: string; label: string; swatch: [string, string, string, string] };

	const systemSwatch: [string, string, string, string] = [
		"#a3a3a3",
		"#525252",
		"#e5e5e5",
		"#171717",
	];

	const entries = $derived<Entry[]>([
		{ name: "system", label: t("theme.system"), swatch: systemSwatch },
		...themeState.themes.map((th) => ({ name: th.name, label: th.label, swatch: th.swatch })),
	]);

	const activeName = $derived(themeState.theme);

	const activeSwatch = $derived.by<[string, string, string, string]>(() => {
		const e = entries.find((x) => x.name === activeName);
		if (e && e.name !== "system") return e.swatch;
		const base = themeState.themes.find(
			(t) => t.name === (themeState.resolvedTheme === "dark" ? "dark" : "light")
		);
		return base?.swatch ?? systemSwatch;
	});

	function pick(name: string) {
		themeState.setTheme(name);
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
		if (open && !target.closest("[data-theme-switcher]")) open = false;
	}
</script>

<svelte:window onkeydown={onWindowKeydown} onclick={onWindowClick} />

<div class="relative" data-theme-switcher>
	<button
		type="button"
		onclick={toggle}
		aria-label={t("a11y.changeTheme")}
		aria-haspopup="menu"
		aria-expanded={open}
		class="docs-theme-btn border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-9 items-center gap-1.5 rounded-md border px-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
	>
		<span class="grid grid-cols-2 gap-0.5" aria-hidden="true">
			{#each activeSwatch as c}
				<span class="size-1.5 rounded-full" style="background:{c}"></span>
			{/each}
		</span>
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
			class="bg-popover border-border absolute right-0 z-[60] mt-1 max-h-80 w-52 overflow-y-auto rounded-lg border p-1.5 shadow-lg"
			role="menu"
			aria-label={t("theme.heading")}
		>
			<p class="text-muted-foreground px-2 py-1.5 text-xs font-semibold tracking-wider uppercase">
				{t("theme.heading")}
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
					<span
						class="border-border grid size-5 shrink-0 grid-cols-2 gap-px overflow-hidden rounded border p-0.5"
						aria-hidden="true"
					>
						{#each entry.swatch as c}
							<span class="rounded-full" style="background:{c}"></span>
						{/each}
					</span>
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
