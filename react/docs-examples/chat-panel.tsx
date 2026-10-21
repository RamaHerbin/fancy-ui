import { useState } from "react";
import { ChatMessage, ChatPanel, Composer } from "fancy-ui-react";

interface Turn {
	id: string;
	role: "user" | "assistant";
	content: string;
}

export function ChatPanelExample() {
	const [turns, setTurns] = useState<Turn[]>([
		{ id: "t1", role: "user", content: "Why does my transcript jump around?" },
		{
			id: "t2",
			role: "assistant",
			content:
				"Something is scrolling it for you on every chunk, even when you were reading above.",
		},
	]);
	const [draft, setDraft] = useState("");

	function send({ text }: { text: string }) {
		setTurns((current) => [
			...current,
			{ id: `t${current.length + 1}`, role: "user", content: text },
		]);
	}

	return (
		<div className="h-[26rem] w-full max-w-xl">
			<ChatPanel
				header={
					<div className="flex items-center justify-between px-4 py-3">
						<p className="text-sm font-semibold">Scrolling behaviour</p>
					</div>
				}
				composer={
					<div className="p-3">
						<Composer
							value={draft}
							onValueChange={setDraft}
							placeholder="Ask a follow-up"
							onSubmit={send}
						/>
					</div>
				}
			>
				<div className="flex flex-col gap-5 px-4 py-4">
					{turns.map((turn) => (
						<ChatMessage key={turn.id} role={turn.role} content={turn.content} />
					))}
				</div>
			</ChatPanel>
		</div>
	);
}
