// Parity variant for scripts/parity/states.mjs; mirrors
// src/routes/_parity/[slug]/variants/toast--action.svelte.
import { Button, Toaster, toast } from "fancy-ui-react";

// the toaster is fixed to the page corner; the stage shot frames it, so it is pinned inside the stage box.
const PIN = `.ft-toaster-viewport { top: 120px !important; left: 120px !important; right: auto !important; bottom: auto !important; }`;

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
			<style>{PIN}</style>
			<Toaster />
			<Button onClick={show}>Show toast</Button>
		</>
	);
}
