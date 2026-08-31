/*
 * Test-only integration rig: the flagship composition, assembled the way the
 * README tells a consumer to assemble it. Not a `.test.tsx` file, so vitest does
 * not collect it as its own suite, and not exported from index.ts.
 *
 * The part suites each mock the root's context so they can test one component in
 * isolation. This rig mocks nothing — it mounts the real `Composer` around the
 * real parts, so the wiring between them (the input registering its element, the
 * menus reading it back, the core's token arithmetic, the state writing out) is
 * what the assertions actually exercise.
 *
 * Fixtures are exported so the test file and the rig agree on one set of items
 * instead of two copies that can drift.
 */
import { useState } from "react";

import type {
	AttachmentData,
	CommandItemData,
	ModelOptionData,
} from "../../internals/ai-types.js";
import { Composer } from "./Composer.js";
import { ComposerAttachments } from "./ComposerAttachments.js";
import { ComposerCommandMenu } from "./ComposerCommandMenu.js";
import type { ComposerCommandMenuProps } from "./ComposerCommandMenu.js";
import { ComposerInput } from "./ComposerInput.js";
import { ComposerModelPicker } from "./ComposerModelPicker.js";
import { ComposerSubmit } from "./ComposerSubmit.js";
import { ComposerToolbar } from "./ComposerToolbar.js";

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

export interface IntegrationHarnessProps {
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

export function IntegrationHarness({
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
}: IntegrationHarnessProps) {
	// Seeded once: the seeds are fixed for a mounted rig.
	const [draft, setDraft] = useState(initialValue);
	const [attachments, setAttachments] = useState<AttachmentData[]>(() => [...initialAttachments]);
	const [model, setModel] = useState<string | undefined>(initialModel);

	/**
	 * Stand in for a consumer that uploads and then appends the result.
	 *
	 * The id counts from the list length rather than from the file name, so two
	 * picks of the same file still get two ids — which is what a real upload
	 * queue produces, and what the chip row has to survive.
	 */
	function handleAttach(files: File[]) {
		onAttach?.(files);
		setAttachments((current) => [
			...current,
			...files.map((file, index) => ({
				id: `${file.name}#${current.length + index}`,
				name: file.name,
				size: file.size,
			})),
		]);
	}

	return (
		<>
			<Composer
				value={draft}
				onValueChange={setDraft}
				attachments={attachments}
				onAttachmentsChange={setAttachments}
				disabled={disabled}
				streaming={streaming}
				onSubmit={onSubmit}
				onStop={onStop}
				onAttach={handleAttach}
				accessory={accessory ? <div data-testid="accessory">Recording…</div> : undefined}
			>
				<ComposerAttachments />
				<ComposerInput placeholder="Ask anything" />
				<ComposerToolbar>
					<ComposerModelPicker
						models={MODELS}
						value={model}
						onValueChange={setModel}
						onChange={onModelChange}
					/>
					<div className="flex-1" />
					<ComposerSubmit />
				</ComposerToolbar>

				{/* Two menus on one textarea: each answers to its own trigger character. */}
				<ComposerCommandMenu trigger="/" items={COMMANDS} className="ft-menu-commands" />
				<ComposerCommandMenu
					trigger="@"
					items={PEOPLE}
					onSelect={mentionSelect}
					className="ft-menu-mentions"
				/>
			</Composer>

			<output data-testid="draft">{draft}</output>
			<output data-testid="attachment-count">{attachments.length}</output>
			<output data-testid="attachment-ids">{attachments.map((entry) => entry.id).join(",")}</output>
			<output data-testid="model">{model ?? ""}</output>
		</>
	);
}
