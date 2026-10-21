import { useState } from "react";
import { Button, StatusMorph, Toaster, dismissToast, toast } from "fancy-ui-react";
import type { StatusMorphState } from "fancy-ui-react";

// Stand-in for your request: resolves after a short delay, or rejects when asked to.
function saveDraft(fail: boolean): Promise<void> {
	return new Promise((resolve, reject) => {
		setTimeout(() => (fail ? reject(new Error("offline")) : resolve()), 1200);
	});
}

export function SavePublishExample() {
	const [failNext, setFailNext] = useState(false);
	const [status, setStatus] = useState<StatusMorphState>("idle");

	async function publish() {
		if (status === "loading") return;
		setStatus("loading");
		try {
			await saveDraft(failNext);
			// Success is only ever shown once the request has resolved.
			setStatus("success");
		} catch {
			setStatus("error");
			const id = toast({
				title: "Could not publish",
				description: "Check your connection and try again.",
				variant: "error",
				action: {
					label: "Retry",
					onClick: () => {
						dismissToast(id);
						void publish();
					},
				},
			});
		}
	}

	return (
		<>
			<Toaster />
			<div className="flex flex-wrap items-center gap-4">
				<Button
					loading={status === "loading"}
					onClick={publish}
					iconEnd={<StatusMorph state={status} onStateChange={setStatus} />}
				>
					Publish
				</Button>
				<label className="text-muted-foreground flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={failNext}
						onChange={(event) => setFailNext(event.target.checked)}
					/>
					Fail the next save
				</label>
			</div>
		</>
	);
}
