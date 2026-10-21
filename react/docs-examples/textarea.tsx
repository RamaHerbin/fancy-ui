import { useState } from "react";
import { Textarea } from "fancy-ui-react";

export function TextareaExample() {
	const [message, setMessage] = useState("");

	return (
		<div className="w-full max-w-sm">
			<Textarea
				value={message}
				onValueChange={setMessage}
				placeholder="A multi-line message…"
				label="Message"
			/>
		</div>
	);
}
