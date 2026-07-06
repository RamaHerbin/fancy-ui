<script lang="ts">
	import { createI18n } from "$lib/stores";
	import { localeBadge } from "$lib/i18n/locales.js";

	const i18n = createI18n();

	let open = $state(false);
	let selectedIndex = $state(0);

	const activeCode = $derived(i18n.locale);

	function pick(code: string) {
		i18n.setLocale(code);
		open = false;
	}

	function toggle() {
		open = !open;
		if (open)
			selectedIndex = Math.max(
				0,
				i18n.locales.findIndex((l) => l.code === activeCode)
			);
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === "Escape") {
			open = false;
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, i18n.locales.length - 1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === "Enter") {
			e.preventDefault();
			pick(i18n.locales[selectedIndex].code);
		}
	}

	function onWindowClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (open && !target.closest("[data-language-switcher]")) open = false;
	}
</script>

<svelte:window onkeydown={onWindowKeydown} onclick={onWindowClick} />

<div class="relative" data-language-switcher>
	<button
		type="button"
		onclick={toggle}
		aria-label={i18n.t("a11y.changeLanguage")}
		aria-haspopup="menu"
		aria-expanded={open}
		class="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-9 items-center gap-1.5 rounded-md border px-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
	>
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M2 12h20" />
			<path
				d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
			/>
		</svg>
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
			class="bg-popover border-border absolute end-0 z-[60] mt-1 max-h-80 w-56 overflow-y-auto rounded-lg border p-1.5 shadow-lg"
			role="menu"
			aria-label={i18n.t("language.heading")}
		>
			<p class="text-muted-foreground px-2 py-1.5 text-xs font-semibold tracking-wider uppercase">
				{i18n.t("language.heading")}
			</p>
			{#each i18n.locales as locale, i (locale.code)}
				<button
					type="button"
					role="menuitemradio"
					aria-checked={locale.code === activeCode}
					dir={locale.dir}
					onclick={() => pick(locale.code)}
					onmouseenter={() => (selectedIndex = i)}
					class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors {i ===
					selectedIndex
						? 'bg-accent text-accent-foreground'
						: 'text-foreground'}"
				>
					<span
						class="border-border text-muted-foreground w-7 shrink-0 rounded border px-1 py-0.5 text-center font-mono text-[10px] tracking-wider"
						aria-hidden="true"
					>
						{localeBadge(locale.code)}
					</span>
					<span class="flex-1 text-start">{locale.native}</span>
					{#if locale.code === activeCode}
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
