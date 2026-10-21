// Perf harness entry for fancy-ui-svelte. Copied over src/main.js of a kept
// consumer app by scripts/perf/measure.mjs; never imported by the repo.
// Exposes window.__perf, the only surface the Playwright driver talks to.
import { mount, unmount } from "svelte";
import {
	BorderBeam,
	DisplacementText,
	FluidCursor,
	MosaicGlow,
	Toaster,
	dismissToast,
	toast,
} from "fancy-ui-svelte";
import "./app.css";

const COMPONENTS = {
	"fluid-cursor": { Component: FluidCursor, props: { contained: true } },
	"border-beam": { Component: BorderBeam, props: {} },
	"displacement-text": { Component: DisplacementText, props: { text: "Hover Me", fontSize: 64 } },
	"mosaic-glow": { Component: MosaicGlow, props: {} },
};

const live = [];

function makeBox() {
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

window.__perf = {
	names: [...Object.keys(COMPONENTS), "toast"],
	mount(name, count = 1) {
		for (let i = 0; i < count; i++) {
			const box = makeBox();
			if (name === "toast") {
				// One Toaster for the first instance, then 4 toasts for it (the
				// visible cap) and one more toast per extra instance.
				const ids = [];
				const first = i === 0;
				const handle = first ? mount(Toaster, { target: box }) : null;
				for (let k = 0; k < (first ? 4 : 1); k++) {
					ids.push(
						toast({ title: `Toast ${i}.${k}`, description: "Perf harness", duration: Infinity })
					);
				}
				live.push({
					box,
					destroy: () => {
						ids.forEach(dismissToast);
						if (handle) unmount(handle);
					},
					ids,
				});
			} else {
				const { Component, props } = COMPONENTS[name];
				const handle = mount(Component, { target: box, props });
				live.push({ box, destroy: () => unmount(handle), ids: [] });
			}
		}
	},
	async unmountAll() {
		while (live.length) {
			const { box, destroy } = live.pop();
			destroy();
			box.remove();
		}
	},
	boxRect() {
		const r = document.querySelector(".perf-box")?.getBoundingClientRect();
		return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
	},
};
window.__perfReady = true;
