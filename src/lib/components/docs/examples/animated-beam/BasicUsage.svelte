<script lang="ts">
	import { AnimatedBeam } from "$lib/fancy-ui/animated-beam";
	import FileText from "@lucide/svelte/icons/file-text";
	import Database from "@lucide/svelte/icons/database";
	import MessageSquare from "@lucide/svelte/icons/message-square";
	import Sparkles from "@lucide/svelte/icons/sparkles";
	import User from "@lucide/svelte/icons/user";

	let containerRef = $state<HTMLElement>();
	let docsRef = $state<HTMLElement>();
	let dataRef = $state<HTMLElement>();
	let chatRef = $state<HTMLElement>();
	let hubRef = $state<HTMLElement>();
	let userRef = $state<HTMLElement>();

	// Nested frame: a hairline shell around a darker inner well.
	const node =
		"relative z-10 rounded-2xl border border-black/[0.08] bg-[#fafafa] p-1 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-[#141416] dark:shadow-none";
	const well =
		"flex items-center justify-center rounded-xl border border-black/[0.06] bg-white text-neutral-700 dark:border-white/[0.06] dark:bg-[#0b0b0c] dark:text-neutral-300";
</script>

<div
	class="w-full rounded-[22px] border border-black/[0.08] bg-[#f4f4f5] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
>
	<div
		bind:this={containerRef}
		class="relative flex h-[420px] w-full items-center justify-center overflow-hidden rounded-2xl border border-black/[0.06] bg-[#fafafa] dark:border-white/[0.06] dark:bg-[#111113]"
	>
		<!-- faint dot field -->
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(0,0,0,0.07)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] [background-size:18px_18px] dark:[background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)]"
		></div>

		<div class="flex w-full max-w-xl items-center justify-between px-8 sm:px-12">
			<div class="flex flex-col gap-10">
				<div bind:this={docsRef} class={node}>
					<div class="{well} size-11"><FileText class="size-[18px]" strokeWidth={1.6} /></div>
				</div>
				<div bind:this={dataRef} class={node}>
					<div class="{well} size-11"><Database class="size-[18px]" strokeWidth={1.6} /></div>
				</div>
				<div bind:this={chatRef} class={node}>
					<div class="{well} size-11"><MessageSquare class="size-[18px]" strokeWidth={1.6} /></div>
				</div>
			</div>

			<div bind:this={hubRef} class="{node} rounded-[22px] p-1.5">
				<div class="{well} size-16 rounded-[16px]">
					<Sparkles class="size-6" strokeWidth={1.5} />
				</div>
			</div>

			<div bind:this={userRef} class={node}>
				<div class="{well} size-11"><User class="size-[18px]" strokeWidth={1.6} /></div>
			</div>
		</div>

		{#if containerRef && hubRef}
			{#if docsRef}
				<AnimatedBeam
					{containerRef}
					fromRef={docsRef}
					toRef={hubRef}
					curvature={-60}
					endYOffset={-12}
					gradientStartColor="#f2b880"
					gradientStopColor="#a78bfa"
					seed={3}
				/>
			{/if}
			{#if dataRef}
				<AnimatedBeam
					{containerRef}
					fromRef={dataRef}
					toRef={hubRef}
					gradientStartColor="#f2b880"
					gradientStopColor="#a78bfa"
					seed={7}
					delay={0.9}
				/>
			{/if}
			{#if chatRef}
				<AnimatedBeam
					{containerRef}
					fromRef={chatRef}
					toRef={hubRef}
					curvature={60}
					endYOffset={12}
					gradientStartColor="#f2b880"
					gradientStopColor="#a78bfa"
					seed={11}
					delay={1.7}
				/>
			{/if}
			{#if userRef}
				<AnimatedBeam
					{containerRef}
					fromRef={hubRef}
					toRef={userRef}
					gradientStartColor="#f2b880"
					gradientStopColor="#a78bfa"
					seed={5}
					delay={2.4}
				/>
			{/if}
		{/if}
	</div>
</div>
