// Perf harness entry for fancy-ui-react. Copied over src/main.tsx of a kept
// consumer app by scripts/perf/measure.mjs; never imported by the repo.
// Exposes window.__perf, the only surface the Playwright driver talks to.
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
	BorderBeam,
	DisplacementText,
	FluidCursor,
	MosaicGlow,
	Toaster,
	dismissToast,
	toast,
} from "fancy-ui-react";
import "fancy-ui-react/styles.css";
import "./app.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENTS: Record<string, { Component: any; props: Record<string, unknown> }> = {
	"fluid-cursor": { Component: FluidCursor, props: { contained: true } },
	"border-beam": { Component: BorderBeam, props: {} },
	"displacement-text": { Component: DisplacementText, props: { text: "Hover Me", fontSize: 64 } },
	"mosaic-glow": { Component: MosaicGlow, props: {} },
};

const live: { box: HTMLElement; root: Root | null; ids: string[] }[] = [];

function makeBox(): HTMLElement {
	const stage =
		document.getElementById("stage") ??
		document.body.appendChild(Object.assign(document.createElement("div"), { id: "stage" }));
	const box = document.createElement("div");
	box.className = "perf-box";
	box.style.cssText =
		"position:relative;width:480px;height:240px;margin:8px;display:inline-block;overflow:hidden";
	stage.appendChild(box);
	return box;
}

// StrictMode is deliberately off: it double-invokes effects in development
// only, and the harness measures the production build.
(window as unknown as { __perf: unknown }).__perf = {
	names: [...Object.keys(COMPONENTS), "toast"],
	mount(name: string, count = 1) {
		for (let i = 0; i < count; i++) {
			const box = makeBox();
			if (name === "toast") {
				const first = i === 0;
				let root: Root | null = null;
				if (first) {
					root = createRoot(box);
					root.render(createElement(Toaster));
				}
				const ids: string[] = [];
				for (let k = 0; k < (first ? 4 : 1); k++) {
					ids.push(
						toast({ title: `Toast ${i}.${k}`, description: "Perf harness", duration: Infinity })
					);
				}
				live.push({ box, root, ids });
			} else {
				const { Component, props } = COMPONENTS[name];
				const root = createRoot(box);
				root.render(createElement(Component, props));
				live.push({ box, root, ids: [] });
			}
		}
	},
	async unmountAll() {
		while (live.length) {
			const { box, root, ids } = live.pop()!;
			ids.forEach(dismissToast);
			root?.unmount();
			box.remove();
		}
	},
	boxRect() {
		const r = document.querySelector(".perf-box")?.getBoundingClientRect();
		return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
	},
};
(window as unknown as { __perfReady: boolean }).__perfReady = true;
