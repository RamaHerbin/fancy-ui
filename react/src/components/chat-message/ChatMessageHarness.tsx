/*
 * Test-only composition rig, transposed from the Svelte harness. It is not a
 * `.test.tsx` file, so vitest does not collect it as a suite of its own, and it
 * is not exported from index.ts.
 *
 * The parts get exercised through real markup here, which is the only way to
 * prove they read the context the root actually publishes rather than one the
 * test invented.
 */
import { ChatMessage } from "./ChatMessage.js";
import { ChatMessageActions } from "./ChatMessageActions.js";
import { ChatMessageAction } from "./ChatMessageAction.js";
import { ChatMessageBranches } from "./ChatMessageBranches.js";

export interface ChatMessageHarnessProps {
	role?: "user" | "assistant" | "system";
	content?: string;
	alwaysVisible?: boolean;
	index?: number;
	count?: number;
	onNavigate?: (index: number) => void;
	onCopy?: () => void;
	sound?: boolean;
}

export function ChatMessageHarness({
	role = "assistant",
	content = "The answer",
	alwaysVisible = false,
	index = 2,
	count = 3,
	onNavigate = () => {},
	onCopy = () => {},
	sound = false,
}: ChatMessageHarnessProps) {
	return (
		<ChatMessage
			role={role}
			content={content}
			sound={sound}
			actions={
				<ChatMessageActions alwaysVisible={alwaysVisible}>
					<ChatMessageAction label="Copy" confirmLabel="Copied" onClick={onCopy}>
						<span aria-hidden="true">C</span>
					</ChatMessageAction>
				</ChatMessageActions>
			}
			footer={<ChatMessageBranches index={index} count={count} onNavigate={onNavigate} />}
		/>
	);
}
