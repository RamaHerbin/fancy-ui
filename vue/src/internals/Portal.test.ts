import { afterEach, describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/vue";
import { createSSRApp, defineComponent, h, nextTick, ref, watch } from "vue";
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

	// The React package's portal contract: the server emits nothing, the
	// hydration render emits nothing, and the target is resolved once after
	// mount. Nothing lands in the teleport buffer at all, so there is no
	// anchor pair for the hydration pass to trip over, and two renders are
	// byte-identical.
	it("emits nothing on the server, with no document, deterministically", async () => {
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

			expect(first).not.toContain("portal content");
			expect(first).not.toContain("teleport");
			expect(Object.keys(firstCtx.teleports ?? {})).toEqual([]);
			expect(first).toBe(second);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	// The server is recognised by its SSR context, not by a missing
	// `document`: a server render in a DOM-shimmed runtime is gated as well.
	it("emits nothing on the server even when a document exists", async () => {
		const App = defineComponent({
			render() {
				return h(Portal, null, { default: () => h("div", null, "portal content") });
			},
		});
		const ctx: { teleports?: Record<string, string> } = {};
		const html = await renderToString(createSSRApp(App), ctx);

		expect(html).not.toContain("portal content");
		expect(html).not.toContain("teleport");
		expect(Object.keys(ctx.teleports ?? {})).toEqual([]);
	});

	it("hydrates cleanly and portals on the first patch after mount", async () => {
		const App = defineComponent({
			render() {
				return h("main", null, [
					h(Portal, null, {
						default: () => h("div", { "data-testid": "hydrated-content" }, "portal content"),
					}),
				]);
			},
		});

		const html = await renderToString(createSSRApp(App));
		const host = document.createElement("div");
		host.innerHTML = html;
		document.body.appendChild(host);
		extraTargets.push(host);

		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const app = createSSRApp(App);
		try {
			app.mount(host);

			// The hydration render emits nothing: no mismatch, and nothing
			// portalled yet.
			expect(document.body.querySelector('[data-testid="hydrated-content"]')).toBeNull();
			const messages = [...warn.mock.calls, ...error.mock.calls].map((c) => String(c[0]));
			expect(messages.filter((m) => /hydrat|mismatch/i.test(m))).toEqual([]);

			await nextTick();
			const content = document.body.querySelector('[data-testid="hydrated-content"]');
			expect(content).not.toBeNull();
			// Portalled into the body, not left inside the app's own subtree.
			expect(host.contains(content)).toBe(false);
		} finally {
			app.unmount();
			warn.mockRestore();
			error.mockRestore();
		}
	});

	// A fresh client mount is NOT deferred: the content is attached during the
	// patch that creates the portal, before any post-flush watcher runs. The
	// presence clock starts its entrance legs from exactly such a watcher, so a
	// portal that waited for its own `onMounted` would skip every entrance.
	it("portals synchronously on a fresh client mount", async () => {
		const show = ref(false);
		const seen: Array<Element | null> = [];
		const Wrapper = defineComponent({
			setup() {
				watch(
					show,
					() => {
						seen.push(document.body.querySelector('[data-testid="fresh-content"]'));
					},
					{ flush: "post" }
				);
				return () =>
					show.value
						? h(Portal, null, {
								default: () => h("div", { "data-testid": "fresh-content" }, "portal content"),
							})
						: null;
			},
		});

		render(Wrapper);
		expect(document.body.querySelector('[data-testid="fresh-content"]')).toBeNull();

		show.value = true;
		await nextTick();

		// Already attached when the post-flush watcher of the same flush ran.
		expect(seen).toHaveLength(1);
		expect(seen[0]).not.toBeNull();
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
