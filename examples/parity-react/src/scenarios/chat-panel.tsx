// Mirrors src/lib/components/docs/examples/chat-panel/BasicUsage.svelte.
import { useEffect, useRef, useState } from "react";
import { ChatMessage, ChatPanel, Composer } from "fancy-ui-react";

interface Turn {
	id: string;
	role: "user" | "assistant";
	content: string;
}

const ANSWER =
	"Then it lets go. The panel only follows the bottom while you are already there, so scrolling up to re-read something is a decision it respects until you take the pill back down.";

/** Between two words of the reply, and how long a finished answer sits there. */
const WORD_MS = 45;
const READ_MS = 3400;

const SEED: Turn[] = [
	{
		id: "t1",
		role: "user",
		content: "Why does my transcript jump around while an answer is still coming in?",
	},
	{
		id: "t2",
		role: "assistant",
		content:
			"Because something is scrolling it for you on every chunk, whether or not you were at the bottom.",
	},
	{ id: "t3", role: "user", content: "And if I scroll up to re-read something?" },
];

export default function Scenario() {
	const [turns, setTurns] = useState<Turn[]>(SEED);
	const [draft, setDraft] = useState("");
	const [reply, setReply] = useState("");
	const [streaming, setStreaming] = useState(false);
	const sent = useRef(0);

	function send(payload: { text: string }) {
		sent.current += 1;
		const id = `sent-${sent.current}`;
		setTurns((t) => [...t, { id, role: "user", content: payload.text }]);
	}

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setReply(ANSWER);
			return;
		}

		const words = ANSWER.split(" ");
		let timer: ReturnType<typeof setTimeout>;
		let i = 0;
		let current = "";

		function word() {
			if (i < words.length) {
				current = i === 0 ? words[0] : `${current} ${words[i]}`;
				setReply(current);
				i += 1;
				timer = setTimeout(word, WORD_MS);
				return;
			}
			setStreaming(false);
			timer = setTimeout(restart, READ_MS);
		}

		function restart() {
			current = "";
			setReply("");
			i = 0;
			setStreaming(true);
			timer = setTimeout(word, 400);
		}

		restart();
		return () => clearTimeout(timer);
	}, []);

	return (
		<div className="h-[26rem] w-full max-w-xl">
			<ChatPanel
				sound
				streaming={streaming}
				empty={false}
				header={
					<div className="flex items-center justify-between gap-3 px-4 py-3">
						<p className="text-sm font-semibold">Scrolling behaviour</p>
						<span className="text-muted-foreground font-mono text-xs">balanced · 200k</span>
					</div>
				}
				composer={
					<div className="p-3">
						<Composer
							sound
							value={draft}
							onValueChange={setDraft}
							placeholder="Ask a follow-up"
							onSubmit={send}
						/>
					</div>
				}
			>
				<div className="flex flex-col gap-5 px-4 py-4">
					{turns.map((turn, i) => (
						<ChatMessage key={`${turn.id}#${i}`} role={turn.role} content={turn.content} />
					))}

					<ChatMessage role="assistant" content={reply} streaming={streaming} />
				</div>
			</ChatPanel>
		</div>
	);
}
