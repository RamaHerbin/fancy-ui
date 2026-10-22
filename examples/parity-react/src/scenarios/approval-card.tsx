// Mirrors src/lib/components/docs/examples/approval-card/BasicUsage.svelte.
import { useState } from "react";
import { ApprovalCard } from "fancy-ui-react";
import type { ApprovalState } from "fancy-ui-react";

export default function Scenario() {
	const [branchState, setBranchState] = useState<ApprovalState>("pending");
	const [migrationState, setMigrationState] = useState<ApprovalState>("pending");

	const settled = [branchState, migrationState].filter((state) => state !== "pending").length;

	function reset() {
		setBranchState("pending");
		setMigrationState("pending");
	}

	return (
		<div className="flex w-full max-w-xl flex-col gap-3 p-6">
			<ApprovalCard
				sound
				title="Create branch fix/retry-backoff"
				description="Branches from develop and pushes an empty commit so CI has something to run."
				state={branchState}
				onStateChange={setBranchState}
			/>

			<ApprovalCard
				sound
				title="Run database migration"
				description="Adds two columns to invoices and backfills 41,880 rows. There is no down migration."
				destructive
				approveLabel="Run migration"
				denyLabel="Not now"
				state={migrationState}
				onStateChange={setMigrationState}
			>
				<pre
					className="text-foreground/80 overflow-x-auto rounded-md px-2.5 py-2 font-mono text-xs"
					style={{ background: "color-mix(in oklab, currentColor 7%, transparent)" }}
				>
					pnpm db:migrate --env production --yes
				</pre>
			</ApprovalCard>

			<p className="text-muted-foreground mt-1 text-xs">
				{settled === 0 ? (
					"Both gates are waiting. Nothing runs until you press something."
				) : (
					<>
						{settled} of 2 decided.{" "}
						<button
							type="button"
							className="text-foreground underline decoration-dotted underline-offset-2"
							onClick={reset}
						>
							Reset
						</button>
					</>
				)}
			</p>
		</div>
	);
}
