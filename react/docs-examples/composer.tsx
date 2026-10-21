import { useState } from "react";
import { Composer } from "fancy-ui-react";

export function ComposerExample() {
	const [draft, setDraft] = useState("");
	const [reply, setReply] = useState("");
	const [streaming, setStreaming] = useState(false);

	function send({ text }: { text: string }) {
		setReply(`You asked: "${text}"`);
		setStreaming(true);
		// Stand-in for a request: the send button is a stop button until it lands.
		setTimeout(() => setStreaming(false), 1200);
	}

	return (
		<div className="flex w-full max-w-xl flex-col gap-3">
			{reply ? (
				<p className="bg-muted text-foreground rounded-2xl px-4 py-3 text-sm">{reply}</p>
			) : null}
			<Composer
				value={draft}
				onValueChange={setDraft}
				streaming={streaming}
				placeholder="Ask anything"
				onSubmit={send}
				onStop={() => setStreaming(false)}
			/>
		</div>
	);
}
