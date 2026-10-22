// Mirrors src/lib/components/docs/examples/streaming-text/BasicUsage.svelte.
import { useEffect, useState } from "react";
import { StreamingText } from "fancy-ui-react";

const source =
	"A model answers one token at a time, so the surface it lands on should show that. Each chunk arrives tinted and settles into the paragraph a moment later, which makes the seam between what was already there and what just came in legible without moving any of the text around.";

const words = source.split(" ");

export default function Scenario() {
	const [text, setText] = useState("");
	const [streaming, setStreaming] = useState(false);

	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setText(source);
			return;
		}

		let timer: ReturnType<typeof setTimeout>;
		let i = 0;
		let current = "";

		function tick() {
			if (i < words.length) {
				current = i === 0 ? words[0] : `${current} ${words[i]}`;
				setText(current);
				i += 1;
				timer = setTimeout(tick, 90);
				return;
			}
			setStreaming(false);
			timer = setTimeout(restart, 2400);
		}

		function restart() {
			current = "";
			setText("");
			i = 0;
			setStreaming(true);
			timer = setTimeout(tick, 160);
		}

		restart();
		return () => clearTimeout(timer);
	}, []);

	return (
		<div className="bg-card w-full max-w-xl rounded-lg border p-5">
			<p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
				Assistant
			</p>
			<StreamingText
				text={text}
				streaming={streaming}
				className="text-sm leading-relaxed"
				tintColor="#6366f1"
			/>
		</div>
	);
}
