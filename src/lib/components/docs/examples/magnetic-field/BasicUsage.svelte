<script lang="ts">
	import {
		MagneticField,
		MagneticItem,
		MagnetPuck,
		type MagneticPoint,
	} from "$lib/fancy-ui/magnetic-field";
	import Copy from "@lucide/svelte/icons/copy";
	import Magnet from "@lucide/svelte/icons/magnet";

	// Light things jump, heavy things barely move: the chips and the icon are the
	// lightest, the paragraph the heaviest block on the card.
	const chips = [
		{ label: "Springs", mass: 0.6 },
		{ label: "Falloff", mass: 0.75 },
		{ label: "Polarity", mass: 0.7 },
		{ label: "Mass", mass: 0.85, current: true },
	];

	// The puck's tray, top left of the field. A released puck glides back to
	// it while the items spring home.
	const HOME: MagneticPoint = { x: 44, y: 40 };
	let position = $state<MagneticPoint>({ ...HOME });

	// Amplitude follows the field's width, so a narrow screen is not one heap
	// of items under the magnet: 32 px of travel on a wide card, down to 16.
	let width = $state(0);
	const maxTranslate = $derived(
		width > 0 ? Math.round(Math.min(32, Math.max(16, width * 0.05))) : 32
	);
	const radius = $derived(width > 0 && width < 480 ? 200 : 260);
</script>

<!-- The puck sits in the tray above the card. Pick it up and bring it close,
     or simply move a mouse near the card. -->
<div bind:clientWidth={width} class="mx-auto w-full max-w-2xl">
	<MagneticField
		{radius}
		{maxTranslate}
		maxRotate={6}
		class="bg-muted/60 dark:bg-muted/30 w-full rounded-2xl px-3 pt-20 pb-10 sm:px-16"
	>
		<p class="text-muted-foreground absolute top-7 left-20 pr-4 text-xs leading-snug">
			Drag the magnet toward the card, or bring your pointer close.
		</p>

		<article
			class="mx-auto w-full max-w-[400px] rounded-[28px] bg-[#111112] p-6 text-[#f7f7f5] shadow-[0_24px_60px_-28px_rgb(0_0_0/0.6)] ring-1 ring-white/10 sm:p-10 dark:bg-[#19191b] dark:ring-white/15"
		>
			<header class="flex items-center justify-between">
				<MagneticItem mass={1}>
					<span class="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
						<span class="size-3 rounded-full bg-[#f7f7f5]"></span>
						Lodestone
					</span>
				</MagneticItem>
				<MagneticItem mass={0.7}>
					<span class="rounded-full bg-[#1d2442] px-3 py-1 text-xs font-medium text-[#9db0ff]">
						Field kit
					</span>
				</MagneticItem>
			</header>

			<div class="mt-8 flex flex-wrap gap-2">
				{#each chips as chip (chip.label)}
					<MagneticItem inline mass={chip.mass}>
						<span
							class="rounded-full px-3.5 py-1.5 text-[13px] font-medium {chip.current
								? 'bg-[#41463c] text-white'
								: 'bg-[#252528] text-[#d9d9d6]'}"
						>
							{chip.label}
						</span>
					</MagneticItem>
				{/each}
			</div>

			<MagneticItem mass={0.6} class="mt-8 w-fit">
				<span
					class="flex size-11 items-center justify-center rounded-[12px] bg-[#38363a] text-[#c9c9c4]"
				>
					<Magnet class="size-5" aria-hidden="true" />
				</span>
			</MagneticItem>

			<MagneticItem mass={1.2} class="mt-4 w-fit">
				<p class="text-[30px] leading-[1.05] font-bold tracking-tight text-balance sm:text-[34px]">
					Pull, then let go
				</p>
			</MagneticItem>

			<MagneticItem mass={2.5}>
				<p class="mt-4 text-[13.5px] leading-5 text-[#b9b9b4]">
					Every block on this card has its own weight. Bring the magnet close and the light ones
					jump first, the heading follows, and this paragraph, the heaviest of all, barely moves
					before everything settles back home.
				</p>
			</MagneticItem>

			<div class="mt-8 flex flex-wrap items-center justify-between gap-3">
				<MagneticItem mass={1}>
					<button
						type="button"
						class="rounded-full bg-[#3c3936] px-3.5 py-2 text-[13px] font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9db0ff] sm:px-4"
					>
						Preview
					</button>
				</MagneticItem>
				<MagneticItem mass={1.1}>
					<button
						type="button"
						class="flex items-center gap-2 rounded-full bg-[#232120] px-3.5 py-2 text-[13px] font-medium whitespace-nowrap ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9db0ff] sm:px-4"
					>
						<Copy class="size-3.5" aria-hidden="true" />
						Copy install
					</button>
				</MagneticItem>
			</div>
		</article>

		<MagnetPuck
			bind:position
			size={48}
			label="Magnet: drag it toward the card"
			onHeldChange={(held) => {
				if (!held) position = { ...HOME };
			}}
			class="motion-safe:[&:not([data-held])]:transition-transform motion-safe:[&:not([data-held])]:duration-500 motion-safe:[&:not([data-held])]:ease-out"
		/>
	</MagneticField>
</div>
