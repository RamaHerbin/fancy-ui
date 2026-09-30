<script lang="ts">
	import { Dock, DockIcon, DockSeparator } from "$lib/fancy-ui/dock";
	import PenLine from "@lucide/svelte/icons/pen-line";
	import ImageIcon from "@lucide/svelte/icons/image";
	import Layers from "@lucide/svelte/icons/layers";
	import MessageCircle from "@lucide/svelte/icons/message-circle";
	import Settings from "@lucide/svelte/icons/settings";

	const tools = [
		{ label: "Write", icon: PenLine },
		{ label: "Media", icon: ImageIcon },
		{ label: "Layers", icon: Layers },
		{ label: "Comments", icon: MessageCircle },
	];

	const tile =
		"grid size-full place-items-center rounded-[30%] border border-black/[0.07] bg-gradient-to-b from-white to-zinc-100 text-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.06)] outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60 dark:border-white/[0.08] dark:from-[#26262a] dark:to-[#141416] dark:text-zinc-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_1px_2px_rgba(0,0,0,0.6)]";
</script>

<!-- A side rail: the dock stands on its edge, the indicator dot moves beside the icons. -->
<div
	class="w-full max-w-2xl rounded-[22px] border border-black/[0.06] bg-black/[0.015] p-1.5 dark:border-white/[0.06] dark:bg-white/[0.02]"
>
	<div
		class="flex h-[26rem] items-center rounded-2xl border border-black/[0.06] bg-[#fafafa] pl-10 dark:border-white/[0.06] dark:bg-[#0b0b0c]"
	>
		<Dock
			orientation="vertical"
			direction="top"
			magnification={40}
			class="mx-0"
			ariaLabel="Editor tools"
		>
			{#each tools as tool (tool.label)}
				<DockIcon>
					<button type="button" class={tile} aria-label={tool.label} title={tool.label}>
						<tool.icon class="size-[46%]" strokeWidth={1.6} />
					</button>
				</DockIcon>
			{/each}
			<DockSeparator />
			<DockIcon>
				<button type="button" class={tile} aria-label="Settings" title="Settings">
					<Settings class="size-[46%]" strokeWidth={1.6} />
				</button>
			</DockIcon>
		</Dock>
	</div>
</div>
