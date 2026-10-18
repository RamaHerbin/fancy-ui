<script lang="ts">
	import { Dock, DockIcon, DockSeparator } from "$lib/fancy-ui/dock";
	import House from "@lucide/svelte/icons/house";
	import Search from "@lucide/svelte/icons/search";
	import Inbox from "@lucide/svelte/icons/inbox";
	import Calendar from "@lucide/svelte/icons/calendar";
	import Music from "@lucide/svelte/icons/music";
	import Settings from "@lucide/svelte/icons/settings";
	import Trash2 from "@lucide/svelte/icons/trash-2";

	const apps = [
		{ label: "Home", icon: House },
		{ label: "Search", icon: Search },
		{ label: "Inbox", icon: Inbox },
		{ label: "Calendar", icon: Calendar },
		{ label: "Music", icon: Music },
	];
	const system = [
		{ label: "Settings", icon: Settings },
		{ label: "Trash", icon: Trash2 },
	];

	// One tile look for every app: a squircle with a top-lit face and a hairline.
	const tile =
		"grid size-full place-items-center rounded-[30%] border border-black/[0.07] bg-gradient-to-b from-white to-zinc-100 text-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.06)] outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60 dark:border-white/[0.08] dark:from-[#26262a] dark:to-[#141416] dark:text-zinc-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_1px_2px_rgba(0,0,0,0.6)]";
</script>

<!-- Outer frame, inner stage: the dock rests on a quiet floor. -->
<div
	class="w-full max-w-2xl rounded-[22px] border border-black/[0.06] bg-black/[0.015] p-1.5 dark:border-white/[0.06] dark:bg-white/[0.02]"
>
	<div
		class="relative flex h-64 items-end justify-center overflow-hidden rounded-2xl border border-black/[0.06] bg-[#fafafa] pb-10 dark:border-white/[0.06] dark:bg-[#0b0b0c]"
	>
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(60%_70%_at_50%_100%,rgba(0,0,0,0.045),transparent)] dark:bg-[radial-gradient(60%_70%_at_50%_100%,rgba(255,255,255,0.05),transparent)]"
		></div>
		<Dock direction="bottom" ariaLabel="Applications">
			{#each apps as app (app.label)}
				<DockIcon>
					<button type="button" class={tile} aria-label={app.label} title={app.label}>
						<app.icon class="size-[46%]" strokeWidth={1.6} />
					</button>
				</DockIcon>
			{/each}
			<DockSeparator />
			{#each system as app (app.label)}
				<DockIcon>
					<button type="button" class={tile} aria-label={app.label} title={app.label}>
						<app.icon class="size-[46%]" strokeWidth={1.6} />
					</button>
				</DockIcon>
			{/each}
		</Dock>
	</div>
</div>
