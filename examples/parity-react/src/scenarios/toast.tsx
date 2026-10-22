// Mirrors src/lib/components/docs/examples/toast/BasicUsage.svelte.
import { Button, Toaster, toast } from "fancy-ui-react";

export default function Scenario() {
	const show = () => {
		toast({
			title: "Theme saved",
			description: "CSS copied to the clipboard.",
			variant: "success",
		});
	};

	return (
		<>
			<Toaster sound />
			<Button onClick={show}>Show toast</Button>
		</>
	);
}
