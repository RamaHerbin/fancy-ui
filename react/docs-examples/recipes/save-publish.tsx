import { useRef, useState } from "react";
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
	// The Retry action outlives the render that created it, so anything it reads has to live in a
	// ref: a closed-over `failNext` or `status` would be the value from the first click.
	const failNextRef = useRef(failNext);
	failNextRef.current = failNext;
	const savingRef = useRef(false);

	async function publish() {
		if (savingRef.current) return;
		savingRef.current = true;
		setStatus("loading");
		try {
			await saveDraft(failNextRef.current);
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
		} finally {
			savingRef.current = false;
		}
	}

	return (
		<>
			<Toaster />
			<div className="flex flex-wrap items-center gap-4">
				<Button
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
