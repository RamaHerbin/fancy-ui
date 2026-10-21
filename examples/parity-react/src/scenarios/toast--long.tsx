// Parity variant for scripts/parity/states.mjs; mirrors
// src/routes/_parity/[slug]/variants/toast--long.svelte.
import { Button, Toaster, toast } from "fancy-ui-react";

// the toaster is fixed to the page corner; the stage shot frames it, so it is pinned inside the stage box.
const PIN = `.ft-toaster-viewport { top: 120px !important; left: 120px !important; right: auto !important; bottom: auto !important; }`;

export default function Scenario() {
	const show = () => {
		toast({
			title: "The export of every board in the workspace is ready to download",
			description:
				"The archive holds 48 boards, 1,204 cards and every attachment. The download link stays valid for seven days, and anyone with the link can open it, so share it with care. A new export can be requested from the settings page at any time.",
			variant: "info",
			duration: Infinity,
			action: { label: "Download", onClick: () => {} },
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
