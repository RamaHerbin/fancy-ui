<script lang="ts">
	import { onDestroy } from "svelte";
	import { RainbowButton } from "$lib/fancy-ui/index.js";

	type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

	const managers: PackageManager[] = ["pnpm", "npm", "yarn", "bun"];

	const installCommands: Record<PackageManager, { runner: string; rest: string }> = {
		pnpm: { runner: "pnpm", rest: "add fancy-ui-svelte" },
		npm: { runner: "npm", rest: "install fancy-ui-svelte" },
		yarn: { runner: "yarn", rest: "add fancy-ui-svelte" },
		bun: { runner: "bun", rest: "add fancy-ui-svelte" },
	};

	let manager = $state<PackageManager>("pnpm");
	let copied = $state(false);
	let copyTimeoutId: ReturnType<typeof setTimeout> | undefined;

	const command = $derived(`${installCommands[manager].runner} ${installCommands[manager].rest}`);

	async function copyCommand() {
		if (typeof navigator === "undefined" || !navigator.clipboard) return;
		try {
			await navigator.clipboard.writeText(command);
		} catch {
			// Clipboard write can fail (permissions, insecure context, unsupported browser) — ignore.
			return;
		}
		copied = true;
		if (copyTimeoutId) clearTimeout(copyTimeoutId);
		copyTimeoutId = setTimeout(() => {
			copied = false;
		}, 2000);
	}

	onDestroy(() => {
		if (copyTimeoutId) clearTimeout(copyTimeoutId);
	});
</script>

<section class="flex flex-col gap-14 px-6 py-16 md:px-10 lg:flex-row lg:items-start lg:px-14">
	<!-- Left rail -->
	<div class="flex w-full flex-col gap-4 lg:w-[360px] lg:flex-shrink-0">
		<span class="text-[11px] font-bold tracking-[.14em] text-[#8b7bff] uppercase">
			Installation
		</span>
		<h2 class="text-[34px] leading-[1.2] font-extrabold tracking-[-0.02em] text-[#e6e9ef]">
			Add FancyUI to your project.
		</h2>
		<p class="text-sm leading-[1.65] text-[#9aa3b2]">
			Get started in seconds. FancyUI is built for Svelte 5 and works seamlessly with your stack.
		</p>

		<!-- Package manager tabs -->
		<div
			class="mt-1.5 inline-flex w-fit gap-0.5 rounded-[10px] border border-white/10 bg-[#0d0d14] p-[3px] text-xs"
		>
			{#each managers as m (m)}
				<button
					type="button"
					aria-pressed={manager === m}
					onclick={() => (manager = m)}
					class={[
						"rounded-lg px-4 py-[7px] font-semibold transition-colors",
						manager === m
							? "bg-[#1f1f2c] text-[#e6e9ef]"
							: "text-[#9aa3b2] hover:bg-white/[0.04] hover:text-[#e6e9ef]",
					]}
				>
					{m}
				</button>
			{/each}
		</div>

		<!-- Install command -->
		<div
			class="flex items-center justify-between gap-4 rounded-[10px] border border-white/10 bg-[#0d0d14] px-4 py-[13px] font-mono text-[13px]"
		>
			<span>
				<span class="text-[#c084fc]">{installCommands[manager].runner}</span>
				<span class="text-[#e6edf3]">{installCommands[manager].rest}</span>
			</span>
			<button
				type="button"
				onclick={copyCommand}
				aria-label={copied ? "Command copied" : "Copy install command"}
				class="shrink-0 text-white/40 transition-colors hover:text-white/70"
			>
				{copied ? "Copied" : "⧉"}
			</button>
		</div>

		<span class="text-[12.5px] text-[#8b93ab]">Works with SvelteKit, Vite and more.</span>
	</div>

	<!-- Code panel -->
	<div class="w-full overflow-hidden rounded-2xl border border-white/8 bg-[#0b0b12] lg:flex-1">
		<div class="flex border-b border-white/8 px-[18px]">
			<span
				class="px-4 py-[13px] text-[13px] font-semibold text-[#e6e9ef] shadow-[inset_0_-2px_0_#8b7bff]"
			>
				Svelte
			</span>
			<span class="px-4 py-[13px] text-[13px] font-medium text-[#9aa3b2]">HTML</span>
		</div>

		<div class="p-[22px] font-mono text-[13.5px] leading-[1.8]">
			<div>
				<span class="text-[#e6edf3]">&lt;</span><span class="text-[#7ee787]">script</span><span
					class="text-[#e6edf3]">&gt;</span
				>
			</div>
			<div>
				&nbsp;&nbsp;<span class="text-[#ff7b72]">import</span>
				<span class="text-[#e6edf3]">{`{ RainbowButton }`}</span>
				<span class="text-[#ff7b72]">from</span>
				<span class="text-[#a5d6ff]">'fancy-ui-svelte'</span><span class="text-[#e6edf3]">;</span>
			</div>
			<div>
				<span class="text-[#e6edf3]">&lt;/</span><span class="text-[#7ee787]">script</span><span
					class="text-[#e6edf3]">&gt;</span
				>
			</div>
			<div>&nbsp;</div>
			<div>
				<span class="text-[#e6edf3]">&lt;</span><span class="text-[#7ee787]">RainbowButton</span>
				<span class="text-[#79c0ff]">href</span><span class="text-[#e6edf3]">=</span><span
					class="text-[#a5d6ff]">"/docs"</span
				><span class="text-[#e6edf3]">&gt;</span>
			</div>
			<div>&nbsp;&nbsp;<span class="text-[#e6edf3]">Fancy Button ✨</span></div>
			<div>
				<span class="text-[#e6edf3]">&lt;/</span><span class="text-[#7ee787]">RainbowButton</span
				><span class="text-[#e6edf3]">&gt;</span>
			</div>
		</div>

		<div class="px-[22px] pb-[22px]">
			<RainbowButton href="/docs">Fancy Button ✨</RainbowButton>
		</div>
	</div>
</section>
