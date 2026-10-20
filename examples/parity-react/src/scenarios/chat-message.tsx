// Mirrors src/lib/components/docs/examples/chat-message/BasicUsage.svelte.
import { useEffect, useState } from "react";
import {
	ChatMessage,
	ChatMessageAction,
	ChatMessageActions,
	ChatMessageBranches,
} from "fancy-ui-react";

const question = "What makes a transcript read like a conversation instead of a log?";
const answer =
	"Two things, mostly. The turns are told apart by shape rather than by a label — a filled bubble on the right for you, plain flowing text on the left for the answer — and the controls stay out of the way until you reach for them. Everything else is the same message component wearing a different role.";

const words = answer.split(" ");
const askedAt = Date.now() - 4 * 60 * 1000;

export default function Scenario() {
	const [reply, setReply] = useState("");
	const [streaming, setStreaming] = useState(false);
	const [version, setVersion] = useState(2);
	const [liked, setLiked] = useState(false);

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setReply(answer);
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let i = 0;
		let current = "";

		function tick() {
			if (i < words.length) {
				current = i === 0 ? words[0] : `${current} ${words[i]}`;
				setReply(current);
				i += 1;
				timer = setTimeout(tick, 55);
				return;
			}
			setStreaming(false);
			timer = setTimeout(restart, 3200);
		}

		function restart() {
			current = "";
			setReply("");
			i = 0;
			setStreaming(true);
			timer = setTimeout(tick, 400);
		}

		restart();
		return () => clearTimeout(timer);
	}, []);

	async function copyReply() {
		if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
		try {
			await navigator.clipboard.writeText(reply);
		} catch {
			// Denied permission or an insecure context: nothing to recover from.
		}
	}

	return (
		<div className="bg-card flex w-full max-w-xl flex-col gap-6 rounded-lg border p-5">
			<ChatMessage
				role="user"
				content={question}
				timestamp={askedAt}
				avatar={
					<span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
						YOU
					</span>
				}
			/>

			<ChatMessage
				sound
				role="assistant"
				content={reply}
				streaming={streaming}
				timestamp={askedAt + 6000}
				avatar={
					<span className="flex size-8 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-semibold text-indigo-500">
						AI
					</span>
				}
				actions={
					<ChatMessageActions>
						<ChatMessageAction label="Copy answer" confirmLabel="Copied" onClick={copyReply}>
							<svg
								className="size-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<rect x="9" y="9" width="12" height="12" rx="2" />
								<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
							</svg>
						</ChatMessageAction>

						<ChatMessageAction label="Regenerate" onClick={() => {}}>
							<svg
								className="size-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
								<path d="M21 3v5h-5" />
								<path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
								<path d="M3 21v-5h5" />
							</svg>
						</ChatMessageAction>

						<ChatMessageAction label="Good answer" active={liked} onClick={() => setLiked(!liked)}>
							<svg
								className="size-3.5"
								viewBox="0 0 24 24"
								fill={liked ? "currentColor" : "none"}
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" />
								<path d="M7 10 12 3a2.5 2.5 0 0 1 2.4 3.2L13.5 9h5a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 17 20H7" />
							</svg>
						</ChatMessageAction>
					</ChatMessageActions>
				}
				footer={
					<ChatMessageBranches index={version} count={3} onNavigate={(next) => setVersion(next)} />
				}
			/>
		</div>
	);
}
