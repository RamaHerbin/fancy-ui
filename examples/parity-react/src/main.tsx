/**
 * React parity stage: ?slug=<slug>&theme=light|dark renders
 * src/scenarios/<slug>.tsx alone in the same 800×500 box as the Svelte stage
 * (src/routes/_parity/[slug]/+page.svelte), so scripts/parity/capture.mjs can
 * photograph the three frameworks side by side.
 */

import "./parity.css";
import type { ComponentType } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

const scenarios = import.meta.glob<{ default: ComponentType }>("./scenarios/*.tsx");

const params = new URLSearchParams(location.search);
// ?variant=<name> renders scenarios/<slug>--<name> instead, for an
// interaction state that needs other content (scripts/parity/states.mjs).
const variant = params.get("variant");
const slug = (params.get("slug") ?? "") + (variant ? `--${variant}` : "");
document.documentElement.classList.toggle("dark", params.get("theme") === "dark");

function Stage({ Scenario }: { Scenario: ComponentType | null }) {
	return (
		<div className="bg-background grid min-h-screen place-items-center">
			<div
				data-parity-stage
				className="bg-background relative flex items-center justify-center overflow-hidden"
				style={{ width: "800px", height: "500px" }}
			>
				{Scenario ? (
					<Scenario />
				) : (
					<div data-parity-missing className="text-muted-foreground text-sm">
						No React scenario for "{slug}"
					</div>
				)}
			</div>
		</div>
	);
}

async function mount() {
	const load = scenarios[`./scenarios/${slug}.tsx`];
	const Scenario = load ? (await load()).default : null;
	// Same random stream as the Svelte stage, whatever the imports drew.
	(globalThis as { __parityReseed?: () => void }).__parityReseed?.();
	const root = createRoot(document.getElementById("app")!);
	flushSync(() => root.render(<Stage Scenario={Scenario} />));
	await document.fonts.ready;
	// No rAF wait: capture.mjs freezes the clock (rAF included) until this flag
	// is up, as the Svelte stage's t = 0 is also taken before any frame.
	document.documentElement.dataset.parityReady = "1";
}

mount();
