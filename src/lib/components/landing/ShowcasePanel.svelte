<!--
	The centrepiece: one bordered stage, four scenes, a tab group to swap them.

	Everything inside is a real component or a token-driven surface, so the panel
	re-flows with whatever skin the page is wearing. Nothing here is a mockup —
	that was the failing of the previous landing, which shipped hand-drawn
	previews with a comment admitting they were not live instances.
-->
<script lang="ts">
	import ComponentsScene from "./scenes/ComponentsScene.svelte";
	import FormsScene from "./scenes/FormsScene.svelte";
	import DashboardScene from "./scenes/DashboardScene.svelte";
	import ChatScene from "./scenes/ChatScene.svelte";

	const SCENES = [
		{ id: "components", label: "Components", Scene: ComponentsScene },
		{ id: "forms", label: "Forms", Scene: FormsScene },
		{ id: "dashboard", label: "Dashboard", Scene: DashboardScene },
		{ id: "chat", label: "Chat", Scene: ChatScene },
	] as const;

	type SceneId = (typeof SCENES)[number]["id"];

	let current = $state<SceneId>("components");
	let tablistEl = $state<HTMLDivElement | null>(null);

	const activeIndex = $derived(SCENES.findIndex((s) => s.id === current));
	const ActiveScene = $derived(SCENES[activeIndex]?.Scene ?? ComponentsScene);

	function select(index: number, focus = false) {
		const next = SCENES[(index + SCENES.length) % SCENES.length];
		if (!next) return;
		current = next.id;
		if (focus) {
			const tabs = tablistEl?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
			tabs?.[(index + SCENES.length) % SCENES.length]?.focus();
		}
	}

	function onkeydown(event: KeyboardEvent) {
		const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
		if (step) {
			event.preventDefault();
			select(activeIndex + step, true);
		} else if (event.key === "Home") {
			event.preventDefault();
			select(0, true);
		} else if (event.key === "End") {
			event.preventDefault();
			select(SCENES.length - 1, true);
		}
	}
</script>

<!-- pb-0: the synthwave riser in FooterCta measures against the bottom edge of
     whatever precedes it. Padding here would float its glow off the seam. -->
<section class="mx-auto w-full max-w-[1440px] px-4 pb-0 sm:px-8 lg:px-14">
	<div class="mb-5 flex flex-wrap items-center justify-between gap-4">
		<div
			bind:this={tablistEl}
			role="tablist"
			aria-label="Showcase"
			class="lp-line inline-flex items-center gap-0.5 rounded-full border p-[3px]"
		>
			{#each SCENES as scene, index (scene.id)}
				{@const selected = scene.id === current}
				<!-- Roving tabindex per the ARIA tabs pattern: only the selected tab is
				     a tab stop, and the arrow keys move between them. The handler sits on
				     each tab rather than the tablist, which is where focus actually is. -->
				<button
					type="button"
					role="tab"
					id="scene-tab-{scene.id}"
					aria-selected={selected}
					aria-controls="scene-panel"
					tabindex={selected ? 0 : -1}
					onclick={() => select(index)}
					{onkeydown}
					class="cursor-pointer rounded-full px-3.5 py-[7px] text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none sm:px-4"
					class:lp-muted={!selected}
					style={selected
						? "background:var(--skin-page-fg,#f8fafc);color:var(--skin-page-bg,#050508)"
						: undefined}
				>
					{scene.label}
				</button>
			{/each}
		</div>

		<p class="lp-dim hidden text-[12px] md:block">
			Live components — switch the skin in the header
		</p>
	</div>

	<div
		id="scene-panel"
		role="tabpanel"
		aria-labelledby="scene-tab-{current}"
		class="lp-line rounded-[20px] border p-4 sm:p-6"
	>
		<!-- Keyed on the scene id so Svelte tears down the previous scene's state
		     instead of trying to reconcile two different component trees. -->
		{#key current}
			<div class="scene-in">
				<ActiveScene />
			</div>
		{/key}
	</div>
</section>

<style>
	.scene-in {
		animation: sceneIn 220ms ease-out both;
	}

	@keyframes sceneIn {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.scene-in {
			animation: none;
		}
	}
</style>
