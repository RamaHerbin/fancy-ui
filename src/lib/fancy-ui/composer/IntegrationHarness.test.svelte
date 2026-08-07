<!--
  Test-only integration rig: the flagship composition, assembled the way the
  README tells a consumer to assemble it.

  The part suites each mock the root's context so they can test one component in
  isolation. This rig mocks nothing — it mounts the real `Composer` around the
  real parts, so the wiring between them (the input registering its element, the
  menus reading it back, the core's token arithmetic, the bindings writing out)
  is what the assertions actually exercise.

  Fixtures are exported from the module block so the test file and the rig agree
  on one set of items instead of two copies that can drift. Not exported from
  index.ts, and not collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts" module>
	import type { CommandItemData, ModelOptionData } from "../_internals/ai-types.js";

	/** Generic tiers, so the fixture says nothing about anyone's product line-up. */
	export const MODELS: ModelOptionData[] = [
		{ id: "mini", label: "Mini", badge: "Fast", description: "Short answers, small context." },
		{ id: "pro", label: "Pro", description: "Deeper reasoning, slower." },
		{ id: "max", label: "Max", badge: "New" },
	];

	export const COMMANDS: CommandItemData[] = [
		{ id: "deploy", label: "/deploy", description: "Ship the current branch" },
		{ id: "describe", label: "/describe", description: "Summarise the diff" },
		{ id: "reset", label: "/reset", description: "Clear the conversation" },
	];

	export const PEOPLE: CommandItemData[] = [
		{ id: "jordan", label: "@jordan", description: "Reviewer" },
		{ id: "sam", label: "@sam", description: "On call" },
	];
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import Composer from "./Composer.svelte";
	import ComposerInput from "./ComposerInput.svelte";
	import ComposerSubmit from "./ComposerSubmit.svelte";
	import ComposerToolbar from "./ComposerToolbar.svelte";
	import ComposerModelPicker from "./ComposerModelPicker.svelte";
	import ComposerAttachments from "./ComposerAttachments.svelte";
	import ComposerCommandMenu from "./ComposerCommandMenu.svelte";
	import type { ComposerCommandMenuProps } from "./ComposerCommandMenu.svelte";
	import type { AttachmentData } from "../_internals/ai-types.js";

	interface Props {
		initialValue?: string;
		initialAttachments?: AttachmentData[];
		initialModel?: string;
		disabled?: boolean;
		streaming?: boolean;
		/** Cover the composition with an overlay, the way a voice panel does. */
		accessory?: boolean;
		/** Replaces the mention menu's default completion. */
		mentionSelect?: ComposerCommandMenuProps["onSelect"];
		onSubmit?: (payload: { text: string; attachments: AttachmentData[] }) => void;
		onStop?: () => void;
		onAttach?: (files: File[]) => void;
		onModelChange?: (id: string) => void;
	}

	let {
		initialValue = "",
		initialAttachments = [],
		initialModel,
		disabled = false,
		streaming = false,
		accessory = false,
		mentionSelect,
		onSubmit,
		onStop,
		onAttach,
		onModelChange,
	}: Props = $props();

	// Read once, on purpose: the seeds are fixed for a mounted rig, and untrack
	// says so rather than leaving a compiler hint behind.
	let draft = $state(untrack(() => initialValue));
	let attachments = $state<AttachmentData[]>(untrack(() => [...initialAttachments]));
	let model = $state(untrack(() => initialModel));

	/**
	 * Stand in for a consumer that uploads and then appends the result.
	 *
	 * The id counts from the list length rather than from the file name, so two
	 * picks of the same file still get two ids — which is what a real upload
	 * queue produces, and what the chip row has to survive.
	 */
	function handleAttach(files: File[]) {
		onAttach?.(files);
		attachments = [
			...attachments,
			...files.map((file, index) => ({
				id: `${file.name}#${attachments.length + index}`,
				name: file.name,
				size: file.size,
			})),
		];
	}
</script>

{#snippet overlay()}
	<div data-testid="accessory">Recording…</div>
{/snippet}

<Composer
	bind:value={draft}
	bind:attachments
	{disabled}
	{streaming}
	{onSubmit}
	{onStop}
	onAttach={handleAttach}
	accessory={accessory ? overlay : undefined}
>
	{#snippet children()}
		<ComposerAttachments />
		<ComposerInput placeholder="Ask anything" />
		<ComposerToolbar>
			<ComposerModelPicker models={MODELS} bind:value={model} onChange={onModelChange} />
			<div class="flex-1"></div>
			<ComposerSubmit />
		</ComposerToolbar>

		<!-- Two menus on one textarea: each answers to its own trigger character. -->
		<ComposerCommandMenu trigger="/" items={COMMANDS} class="ft-menu-commands" />
		<ComposerCommandMenu
			trigger="@"
			items={PEOPLE}
			onSelect={mentionSelect}
			class="ft-menu-mentions"
		/>
	{/snippet}
</Composer>

<output data-testid="draft">{draft}</output>
<output data-testid="attachment-count">{attachments.length}</output>
<output data-testid="attachment-ids">{attachments.map((entry) => entry.id).join(",")}</output>
<output data-testid="model">{model ?? ""}</output>
