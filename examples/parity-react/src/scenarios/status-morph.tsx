// Mirrors src/lib/components/docs/examples/status-morph/BasicUsage.svelte.
import { useState } from "react";
import { Button, StatusMorph, Switch } from "fancy-ui-react";

type Status = "idle" | "loading" | "success" | "error";

export default function Scenario() {
	const [status, setStatus] = useState<Status>("idle");
	const [failNext, setFailNext] = useState(false);

	async function save() {
		setStatus("loading");
		await new Promise((resolve) => setTimeout(resolve, 1200));
		setStatus(failNext ? "error" : "success");
	}

	return (
		<div className="flex w-full flex-col items-center gap-6 p-6">
			<Button
				loading={status === "loading"}
				iconStart={<StatusMorph state={status} onStateChange={setStatus} />}
				onClick={save}
			>
				Save changes
			</Button>

			<Switch checked={failNext} onCheckedChange={setFailNext}>
				Fail next save
			</Switch>
		</div>
	);
}
