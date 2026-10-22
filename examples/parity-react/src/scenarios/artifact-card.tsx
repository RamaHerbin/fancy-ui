// Mirrors src/lib/components/docs/examples/artifact-card/BasicUsage.svelte.
import { useCallback, useEffect, useRef, useState } from "react";
import { ArtifactCard } from "fancy-ui-react";
import type { StreamStatus } from "fancy-ui-react";

const DRAFTS = [
	"Revenue closed the quarter at 4.2M, six percent ahead of plan, and for the first time the mid-market segment outgrew enterprise. Two things drove it: the self-serve trial that shipped in May, which now accounts for a third of new logos, and a pricing change nobody expected much from. Churn is flat. The one number worth arguing about is expansion, which slipped for a second quarter running and is the reason next quarter's forecast is not simply this quarter plus growth.",
	"Revenue closed the quarter at 4.2M, six percent ahead of plan — the first time mid-market has outgrown enterprise. Two things drove it: the self-serve trial shipped in May, now a third of new logos, and a pricing change nobody expected much from. Churn is flat. Expansion is the number worth arguing about: it slipped for a second quarter running, which is why next quarter's forecast is not this quarter plus growth. Recommendation: hold the pricing, fund the expansion motion.",
];

const CHUNK = 4;
const TICK_MS = 22;
const LEAD_MS = 500;
const HOLD_MS = 2600;

export default function Scenario() {
	const [version, setVersion] = useState(1);
	const [status, setStatus] = useState<StreamStatus>("idle");
	const [preview, setPreview] = useState("");
	const [opened, setOpened] = useState(false);
	const [copied, setCopied] = useState(false);

	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const stop = useCallback(() => {
		clearTimeout(timer.current);
		timer.current = undefined;
	}, []);

	const settleOn = useCallback(
		(n: number) => {
			stop();
			setVersion(n);
			setPreview(DRAFTS[n - 1]);
			setStatus("done");
		},
		[stop]
	);

	useEffect(() => {
		const writeDraft = (n: number) => {
			setVersion(n);
			setStatus("streaming");
			const full = DRAFTS[n - 1];
			let cut = CHUNK;
			setPreview(full.slice(0, cut));

			const tick = () => {
				cut = Math.min(full.length, cut + CHUNK);
				setPreview(full.slice(0, cut));
				timer.current = setTimeout(cut < full.length ? tick : finish, TICK_MS);
			};

			const finish = () => {
				setStatus("done");
				timer.current = setTimeout(() => writeDraft(n === DRAFTS.length ? 1 : n + 1), HOLD_MS);
			};

			timer.current = setTimeout(tick, LEAD_MS);
		};

		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			settleOn(DRAFTS.length);
			return;
		}

		writeDraft(1);
		return stop;
	}, [settleOn, stop]);

	return (
		<div className="flex w-full max-w-xl flex-col gap-2 p-6">
			<ArtifactCard
				sound
				title="Q3 revenue review"
				kind="Memo"
				version={version}
				versionCount={DRAFTS.length}
				onVersionChange={settleOn}
				status={status}
				preview={preview}
				onOpen={() => setOpened((o) => !o)}
				actions={
					<button
						type="button"
						className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-6 cursor-pointer items-center justify-center rounded transition-colors focus-visible:ring-1 focus-visible:outline-none"
						aria-label={copied ? "Copied" : "Copy document"}
						onClick={() => setCopied((c) => !c)}
					>
						{copied ? (
							<svg
								className="size-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<path d="m5 13 4 4L19 7" />
							</svg>
						) : (
							<svg
								className="size-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.75"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<rect x="9" y="9" width="11" height="11" rx="2" />
								<path d="M5 15V5a2 2 0 0 1 2-2h10" />
							</svg>
						)}
					</button>
				}
			/>

			<p className="text-muted-foreground mt-1 text-xs">
				{opened
					? "That would open the document in a side panel — the copy button kept its own click."
					: "The card is writing itself, then rewriting itself. Click it to open, or use the arrows to settle on a draft."}
			</p>

			<ArtifactCard title="Q3 cohort appendix" kind="Spreadsheet" status="error" />

			<p className="text-muted-foreground text-xs">
				A failure says so in words, in a tinted footer, rather than in the border alone.
			</p>
		</div>
	);
}
