import { afterEach, describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/vue";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import Portal from "./Portal.vue";

// `@testing-library/vue` auto-registers its own `afterEach(cleanup)` on
// import, which unmounts every wrapper still standing — including the
// Teleported content this suite renders straight into `document.body`. A
// manual `document.body.innerHTML = ""` here would rip that DOM out from
// under Vue's own unmount walk (a `null.nextSibling` crash), so cleanup is
// left to that hook; this only removes the extra target elements a test
// created for itself.
const extraTargets: HTMLElement[] = [];

function renderPortal(props: { target?: HTMLElement | string; disabled?: boolean } = {}) {
	return render(Portal, {
		props,
		slots: { default: '<div data-testid="portal-content">portal content</div>' },
	});
}

describe("Portal", () => {
	afterEach(() => {
		for (const el of extraTargets.splice(0)) el.remove();
	});

	it("renders into document.body by default", () => {
		renderPortal();

		const content = document.body.querySelector('[data-testid="portal-content"]');
		expect(content).not.toBeNull();
	});

	it("renders into a given HTMLElement target", () => {
		const target = document.createElement("section");
		document.body.appendChild(target);
		extraTargets.push(target);

		renderPortal({ target });

		expect(target.querySelector('[data-testid="portal-content"]')).not.toBeNull();
	});

	it("renders into a target resolved from a CSS selector", () => {
		const target = document.createElement("section");
		target.id = "modal-root";
		document.body.appendChild(target);
		extraTargets.push(target);

		renderPortal({ target: "#modal-root" });

		expect(target.querySelector('[data-testid="portal-content"]')).not.toBeNull();
	});

	it("falls back to document.body when the selector matches nothing", () => {
		renderPortal({ target: "#does-not-exist" });

		expect(document.body.querySelector('[data-testid="portal-content"]')).not.toBeNull();
	});

	it("removes the content from the DOM on unmount", () => {
		const { unmount } = renderPortal();
		expect(document.body.querySelector('[data-testid="portal-content"]')).not.toBeNull();

		unmount();

		expect(document.body.querySelector('[data-testid="portal-content"]')).toBeNull();
	});

	it("renders in place instead of portalling when disabled", () => {
		const { container } = renderPortal({ disabled: true });

		expect(container.querySelector('[data-testid="portal-content"]')).not.toBeNull();
	});


	// The server branch of the `to` computed. There is no `document` to
	// resolve against in bare Node, and the server output does not go
	// through the target anyway — an open surface is emitted inline in the
	// document body, ahead of the app root, with `#teleports` left empty —
	// so the string `"body"` is what `<Teleport>` is handed there. Handing
	// it a resolved element instead would stringify to `[object
	// HTMLBodyElement]` in the SSR payload.
	it("renders on the server with no document, deterministically", async () => {
		vi.stubGlobal("document", undefined);
		try {
			const App = defineComponent({
				render() {
					return h(Portal, null, {
						default: () => h("div", { "data-testid": "portal-content" }, "portal content"),
					});
				},
			});

			const firstCtx: { teleports?: Record<string, string> } = {};
			const secondCtx: { teleports?: Record<string, string> } = {};
			const first = await renderToString(createSSRApp(App), firstCtx);
			const second = await renderToString(createSSRApp(App), secondCtx);

			// The in-tree placeholder is a comment pair; the markup itself
			// lands in the teleport buffer under the target STRING. `"body"`
			// is that key — a resolved element would stringify to
			// `[object HTMLBodyElement]` and no consumer could splice it.
			expect(Object.keys(firstCtx.teleports ?? {})).toEqual(["body"]);
			expect(firstCtx.teleports?.body).toContain("portal content");
			expect(first).toBe(second);
			expect(secondCtx.teleports).toEqual(firstCtx.teleports);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("moves the content to a new target when the target prop changes", async () => {
		const first = document.createElement("section");
		const second = document.createElement("section");
		document.body.append(first, second);
		extraTargets.push(first, second);

		const Wrapper = defineComponent({
			props: { target: { type: Object as () => HTMLElement, required: true } },
			render() {
				return h(
					Portal,
					{ target: this.target },
					{ default: () => h("div", { "data-testid": "portal-content" }, "portal content") }
				);
			},
		});

		const { rerender } = render(Wrapper, { props: { target: first } });
		expect(first.querySelector('[data-testid="portal-content"]')).not.toBeNull();

		await rerender({ target: second });
		expect(second.querySelector('[data-testid="portal-content"]')).not.toBeNull();
		expect(first.querySelector('[data-testid="portal-content"]')).toBeNull();
	});
});
