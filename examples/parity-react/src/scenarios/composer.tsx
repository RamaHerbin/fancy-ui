// Mirrors src/lib/components/docs/examples/composer/BasicUsage.svelte (self-typing rig included).
import { useEffect, useRef, useState } from "react";
import { Composer } from "fancy-ui-react";

const QUESTION = "Why did the deploy stall?";
const KEY_MS = 55;
const SEND_MS = 520;
const REPLY_MS = 380;
const WORD_MS = 32;
const READ_MS = 3200;

function sentenceFor(prompt: string): string {
	return `You asked: “${prompt}” — and nothing is wired up behind this composer. The reply is on a timer, arriving one word at a time so the send button has something to turn into.`;
}

export default function Scenario() {
	const [draft, setDraft] = useState("");
	const [reply, setReply] = useState("");
	const [streaming, setStreaming] = useState(false);

	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const typed = useRef(0);
	const driving = useRef(false);
	const reduced = useRef(false);
	const draftRef = useRef("");
	const replyRef = useRef("");

	const writeDraft = (v: string) => {
		draftRef.current = v;
		setDraft(v);
	};
	const writeReply = (v: string) => {
		replyRef.current = v;
		setReply(v);
	};

	function answer(prompt: string) {
		clearTimeout(timer.current);
		const words = sentenceFor(prompt).split(" ");
		if (reduced.current) {
			writeReply(words.join(" "));
			setStreaming(false);
			return;
		}
		writeReply("");
		setStreaming(true);
		let i = 0;
		function chunk() {
			if (i < words.length) {
				writeReply(i === 0 ? words[0] : `${replyRef.current} ${words[i]}`);
				i += 1;
				timer.current = setTimeout(chunk, WORD_MS);
				return;
			}
			setStreaming(false);
			if (driving.current) timer.current = setTimeout(restart, READ_MS);
		}
		timer.current = setTimeout(chunk, REPLY_MS);
	}

	function send(payload: { text: string }) {
		answer(payload.text);
	}

	function halt() {
		clearTimeout(timer.current);
		setStreaming(false);
		if (driving.current) timer.current = setTimeout(restart, READ_MS);
	}

	function typeNext() {
		if (typed.current < QUESTION.length) {
			typed.current += 1;
			writeDraft(QUESTION.slice(0, typed.current));
			timer.current = setTimeout(typeNext, KEY_MS);
			return;
		}
		timer.current = setTimeout(() => {
			const text = draftRef.current.trim();
			writeDraft("");
			answer(text);
		}, SEND_MS);
	}

	function restart() {
		writeReply("");
		writeDraft("");
		typed.current = 0;
		timer.current = setTimeout(typeNext, KEY_MS);
	}

	function handOver() {
		if (!driving.current) return;
		driving.current = false;
		clearTimeout(timer.current);
	}

	useEffect(() => {
		reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduced.current) {
			writeReply(sentenceFor(QUESTION));
			return;
		}
		driving.current = true;
		timer.current = setTimeout(typeNext, READ_MS / 4);
		return () => {
			driving.current = false;
			clearTimeout(timer.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div
			className="flex w-full max-w-xl flex-col gap-3 p-6"
			onPointerDownCapture={handOver}
			onKeyDownCapture={handOver}
		>
			{reply && (
				<div className="bg-muted text-foreground mr-auto max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-3">
					<p className="text-sm leading-relaxed">{reply}</p>
				</div>
			)}

			<Composer
				sound
				value={draft}
				onValueChange={writeDraft}
				streaming={streaming}
				placeholder="Ask anything"
				onSubmit={send}
				onStop={halt}
			/>

			<p className="text-muted-foreground text-xs">
				Enter sends, Shift+Enter adds a line. While the reply streams the send button becomes a stop
				button, and the composer refuses to send again until it lands.
			</p>
		</div>
	);
}
