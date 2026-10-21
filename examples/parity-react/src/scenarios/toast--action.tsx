// Parity variant for scripts/parity/states.mjs; mirrors
// src/routes/_parity/[slug]/variants/toast--action.svelte.
import { Button, Toaster, toast } from "fancy-ui-react";

export default function Scenario() {
	const show = () => {
		toast({
			title: "Message archived",
			description: "It left your inbox.",
			variant: "success",
			duration: Infinity,
			action: { label: "Undo", onClick: () => {} },
		});
	};

	return (
		<>
			<Toaster />
			<Button onClick={show}>Show toast</Button>
		</>
	);
}
