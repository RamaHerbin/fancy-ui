<script lang="ts">
	// Retro OS taskbar — Start button (pixel logo), status tagline, live clock.
	// Rendered only when the retro-os skin is active (gated by the caller). All of
	// its styling lives in docs-skin.css under .docs-skin[data-skin="retro-os"].
	import type { Component } from "svelte";
	import { t } from "$lib/stores";

	// Start menu: lazy so the docs bundle only pays for it once someone opens it.
	let open = $state(false);
	let StartMenu = $state<Component<{ onclose: () => void }> | null>(null);
	let wrap: HTMLDivElement | undefined = $state();
	let startBtn: HTMLButtonElement | undefined = $state();

	function closeMenu(refocus = false) {
		open = false;
		if (refocus) startBtn?.focus();
	}

	async function toggleMenu() {
		if (open) return closeMenu();
		open = true;
		if (StartMenu) return;
		try {
			StartMenu = (await import("$lib/components/eggs/retro/StartMenu.svelte")).default;
		} catch (error) {
			// A stale chunk must not leave a phantom "expanded" button behind.
			console.warn("[retro] start menu failed to load", error);
			open = false;
		}
	}

	function onWrapKeydown(e: KeyboardEvent) {
		if (e.key === "Escape" && open) closeMenu(true);
	}

	// Tabbing out of the menu closes it: once focus is elsewhere, the wrapper's
	// Escape handler can no longer reach it. Checked on the next task, because
	// opening About removes the focused item (some engines fire focusout for
	// that) and only then moves focus into the window.
	function onWrapFocusout() {
		if (!open) return;
		setTimeout(() => {
			if (open && !(document.activeElement && wrap?.contains(document.activeElement))) closeMenu();
		}, 0);
	}

	// Outside click closes; the listener only exists while the menu is open.
	$effect(() => {
		if (!open) return;
		const onDown = (e: PointerEvent) => {
			if (!(e.target instanceof Node) || !wrap?.contains(e.target)) closeMenu();
		};
		document.addEventListener("pointerdown", onDown);
		return () => document.removeEventListener("pointerdown", onDown);
	});

	let now = $state(new Date());

	$effect(() => {
		const id = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(id);
	});

	const time = $derived(
		now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
	);
	const date = $derived(
		now.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
	);
</script>

<div class="retro-taskbar" role="presentation">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="retro-start-wrap"
		bind:this={wrap}
		onkeydown={onWrapKeydown}
		onfocusout={onWrapFocusout}
	>
		<button
			type="button"
			class="retro-taskbar-start retro-press"
			bind:this={startBtn}
			onclick={toggleMenu}
			aria-haspopup="menu"
			aria-expanded={open}
			aria-controls="retro-start-menu"
		>
			<span class="retro-pixel-logo retro-pixel-logo-sm" aria-hidden="true">
				<span></span><span></span><span></span><span></span>
			</span>
			{t("retro.start")}
		</button>
		{#if open && StartMenu}
			<StartMenu onclose={() => closeMenu(true)} />
		{/if}
	</div>

	<span class="retro-taskbar-status">
		<span class="retro-taskbar-led" aria-hidden="true"></span>
		{t("retro.tagline")}
	</span>

	<span class="retro-taskbar-clock">
		{time}<br />{date}
	</span>
</div>
