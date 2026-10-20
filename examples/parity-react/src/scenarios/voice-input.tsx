// Mirrors src/lib/components/docs/examples/voice-input/BasicUsage.svelte.
import { useEffect, useRef, useState } from "react";
import { VoiceInput } from "fancy-ui-react";

/** How fast the pretend recogniser hands back another word. */
const WORD_MS = 400;
const WORDS = "show me the retry policy for failed webhook deliveries".split(" ");

export default function Scenario() {
	const [active, setActive] = useState(false);
	const [transcript, setTranscript] = useState("");
	const activeRef = useRef(false);
	const spoken = useRef(0);

	activeRef.current = active;

	const reset = () => {
		spoken.current = 0;
		setTranscript("");
	};

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setActive(true);
			setTranscript(WORDS.join(" "));
			return;
		}
		const timer = setInterval(() => {
			if (!activeRef.current || spoken.current >= WORDS.length) return;
			const word = WORDS[spoken.current];
			setTranscript((t) => (t ? `${t} ${word}` : word));
			spoken.current += 1;
		}, WORD_MS);
		return () => clearInterval(timer);
	}, []);

	return (
		<div className="flex w-full max-w-md flex-col gap-3 p-6">
			<VoiceInput
				sound
				active={active}
				onActiveChange={setActive}
				transcript={transcript}
				demo
				onStop={reset}
				onCancel={reset}
			/>

			<p className="text-muted-foreground text-xs">
				Press the mic and the words arrive as a recogniser would hand them over. The check keeps the
				transcript and closes the panel; the cross throws it away.
			</p>
		</div>
	);
}
