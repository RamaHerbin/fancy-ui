// Mirrors src/lib/components/docs/examples/alert-dialog/BasicUsage.svelte.
import { useState } from "react";
import { AlertDialog, Button } from "fancy-ui-react";

export default function Scenario() {
	const [status, setStatus] = useState("");

	return (
		<>
			<AlertDialog
				sound
				trigger={<Button variant="destructive">Delete project</Button>}
				title="Delete this project?"
				description="This action is irreversible. All data will be lost."
				confirmLabel="Delete"
				onConfirm={() => setStatus("Project deleted.")}
				onCancel={() => setStatus("Cancelled.")}
			/>

			{status ? <p className="text-muted-foreground mt-2 text-[12px]">{status}</p> : null}
		</>
	);
}
