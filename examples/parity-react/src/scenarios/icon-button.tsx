// Mirrors src/lib/components/docs/examples/icon-button/BasicUsage.svelte.
import { useState } from "react";
import { IconButton } from "fancy-ui-react";

export default function Scenario() {
	const [liked, setLiked] = useState(false);

	return (
		<IconButton
			sound
			label={liked ? "Unlike" : "Like"}
			variant={liked ? "accent" : "outline"}
			shape="circle"
			onClick={() => setLiked(!liked)}
		>
			<svg
				className="size-4"
				viewBox="0 0 24 24"
				fill={liked ? "currentColor" : "none"}
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M12 20s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.65-9.5 9-9.5 9Z" />
			</svg>
		</IconButton>
	);
}
