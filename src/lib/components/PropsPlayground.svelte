<script lang="ts" module>
	export type ControlDef =
		| { key: string; type: 'range'; label: string; min: number; max: number; step?: number }
		| { key: string; type: 'number'; label: string; min?: number; max?: number; step?: number }
		| { key: string; type: 'color'; label: string }
		| { key: string; type: 'text'; label: string }
		| { key: string; type: 'boolean'; label: string }
		| { key: string; type: 'select'; label: string; options: { value: string; label: string }[] };

	export type PlaygroundValues = Record<string, string | number | boolean>;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		controls: ControlDef[];
		initialValues: PlaygroundValues;
		preview: Snippet<[PlaygroundValues]>;
	}

	let { controls, initialValues, preview }: Props = $props();

	let panelOpen = $state(false);
	let values = $state<PlaygroundValues>({ ...initialValues });

	function reset() {
		values = { ...initialValues };
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') panelOpen = false;
	}}
/>

<div>
	<!-- Preview card -->
	<div class="bg-card rounded-xl border">
		<div class="flex min-h-48 items-center justify-center p-8">
			{@render preview(values)}
		</div>
		<!-- Footer bar -->
		<div class="border-t px-4 py-3 flex items-center justify-between">
			<span class="text-sm font-medium">Playground</span>
			<button
				onclick={() => (panelOpen = true)}
				class="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
				Customize
			</button>
		</div>
	</div>

	<!-- Backdrop -->
	{#if panelOpen}
		<button
			class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
			onclick={() => (panelOpen = false)}
			aria-label="Close panel"
		></button>
	{/if}

	<!-- Side panel -->
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Customize props"
		class="fixed top-0 right-0 z-50 h-full w-80 flex flex-col bg-background border-l transition-transform duration-300 {panelOpen
			? 'translate-x-0'
			: 'translate-x-full'}"
	>
		<!-- Panel header -->
		<div class="flex h-14 shrink-0 items-center justify-between border-b px-4">
			<span class="font-semibold">Customize</span>
			<div class="flex items-center gap-2">
				<button
					onclick={reset}
					class="text-muted-foreground hover:text-foreground text-sm transition-colors"
				>
					Reset
				</button>
				<button
					onclick={() => (panelOpen = false)}
					class="text-muted-foreground hover:text-foreground transition-colors"
					aria-label="Close"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Controls list -->
		<div class="flex-1 overflow-y-auto p-4 space-y-5">
			{#each controls as def}
				<div>
					{#if def.type === 'range'}
						<div class="flex items-center justify-between mb-1.5">
							<label class="text-sm font-medium" for="ctrl-{def.key}">{def.label}</label>
							<span class="text-muted-foreground text-sm tabular-nums">{values[def.key]}</span>
						</div>
						<input
							id="ctrl-{def.key}"
							type="range"
							min={def.min}
							max={def.max}
							step={def.step ?? 1}
							value={values[def.key] as number}
							oninput={(e) => (values[def.key] = Number(e.currentTarget.value))}
							class="w-full accent-foreground"
						/>
					{:else if def.type === 'number'}
						<label class="text-sm font-medium block mb-1.5" for="ctrl-{def.key}">{def.label}</label>
						<input
							id="ctrl-{def.key}"
							type="number"
							min={def.min}
							max={def.max}
							step={def.step ?? 1}
							value={values[def.key] as number}
							oninput={(e) => (values[def.key] = Number(e.currentTarget.value))}
							class="border-input bg-background w-full rounded-md border px-3 py-1.5 text-sm"
						/>
					{:else if def.type === 'color'}
						<div class="flex items-center justify-between mb-1.5">
							<label class="text-sm font-medium" for="ctrl-{def.key}">{def.label}</label>
							<span class="text-muted-foreground text-sm">{values[def.key]}</span>
						</div>
						<input
							id="ctrl-{def.key}"
							type="color"
							value={values[def.key] as string}
							oninput={(e) => (values[def.key] = e.currentTarget.value)}
							class="h-9 w-full cursor-pointer rounded-md border"
						/>
					{:else if def.type === 'text'}
						<label class="text-sm font-medium block mb-1.5" for="ctrl-{def.key}">{def.label}</label>
						<input
							id="ctrl-{def.key}"
							type="text"
							value={values[def.key] as string}
							oninput={(e) => (values[def.key] = e.currentTarget.value)}
							class="border-input bg-background w-full rounded-md border px-3 py-1.5 text-sm"
						/>
					{:else if def.type === 'boolean'}
						<div class="flex items-center justify-between">
							<label class="text-sm font-medium" for="ctrl-{def.key}">{def.label}</label>
							<button
								id="ctrl-{def.key}"
								role="switch"
								aria-checked={values[def.key] as boolean}
								aria-label={def.label}
								onclick={() => (values[def.key] = !values[def.key])}
								class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {values[
									def.key
								]
									? 'bg-foreground'
									: 'bg-muted'}"
							>
								<span
									class="inline-block h-4 w-4 transform rounded-full bg-background transition-transform {values[
										def.key
									]
										? 'translate-x-6'
										: 'translate-x-1'}"
								></span>
							</button>
						</div>
					{:else if def.type === 'select'}
						<label class="text-sm font-medium block mb-1.5" for="ctrl-{def.key}">{def.label}</label>
						<select
							id="ctrl-{def.key}"
							value={values[def.key] as string}
							onchange={(e) => (values[def.key] = e.currentTarget.value)}
							class="border-input bg-background w-full rounded-md border px-3 py-1.5 text-sm"
						>
							{#each def.options as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
