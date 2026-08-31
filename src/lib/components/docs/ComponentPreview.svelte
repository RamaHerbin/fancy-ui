<script lang="ts">
	import type { Snippet } from "svelte";
	import CodeBlock from "./CodeBlock.svelte";
	import { SoundToggle } from "$lib/fancy-ui/sound/index.js";

	interface Props {
		code?: string;
		title?: string;
		/** Shows the sound switch beside the tabs, for a demo whose component plays cues. */
		sound?: boolean;
		preview: Snippet;
	}

	let { code = "", title = "", sound = false, preview }: Props = $props();

	let activeTab = $state<"preview" | "code">("preview");
</script>

<div class="retro-window-shadow">
	<div class="retro-window border-border overflow-hidden rounded-lg border">
		{#if title}
			<div class="border-border text-foreground border-b px-4 py-2 text-sm font-medium">
				{title}
			</div>
		{/if}
		<!-- Tabs. The sound switch rides the same bar rather than the demo itself, so every example
		     of a sound-capable component gets one without 180-odd demos each pasting their own. -->
		<div class="retro-tabbar border-border flex items-center justify-between border-b">
			<div class="flex">
				<button
					onclick={() => (activeTab = "preview")}
					class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'preview'
						? 'border-foreground text-foreground border-b-2'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Preview
				</button>
				{#if code}
					<button
						onclick={() => (activeTab = "code")}
						class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'code'
							? 'border-foreground text-foreground border-b-2'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						Code
					</button>
				{/if}
			</div>
			{#if sound}
				<SoundToggle size="sm" class="mr-2" />
			{/if}
		</div>

		<!-- Content. Both panes stay mounted so the source is in the served HTML; the inactive one is
		     hidden through the `hidden` attribute on an unstyled wrapper, because a display utility on
		     the element itself would out-rank the user-agent rule for [hidden]. -->
		<div data-pane="preview" hidden={activeTab !== "preview"}>
			<!-- `retro-stage` is the hook the retro-os docs skin styles the demo box with. -->
			<div class="retro-stage bg-background flex min-h-[200px] items-center justify-center p-8">
				<!-- The box is always served, so its height is reserved before the demo mounts; the demo
				     itself is torn down off-tab rather than left animating behind `hidden`. -->
				{#if activeTab === "preview"}
					{@render preview()}
				{/if}
			</div>
		</div>
		{#if code}
			<div data-pane="code" hidden={activeTab !== "code"}>
				<div class="max-h-[500px] overflow-auto">
					<CodeBlock {code} active={activeTab === "code"} />
				</div>
			</div>
		{/if}
	</div>
</div>
