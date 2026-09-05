/**
 * Hydration safety net for the sound store.
 *
 * `sound` is one of the three modules where a server/client divergence is
 * actually reachable: the stored preference exists on the client and not on
 * the server. The store answers it by construction — `getSoundServerSnapshot()`
 * is used for the server render AND the hydration render, and the one
 * `localStorage` read happens in an effect afterwards. These tests prove it by
 * hydrating real server HTML with a preference already in storage and asserting
 * React logged nothing.
 */
import { StrictMode } from "react";
import type { ReactElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetSoundForTests } from "./sound.js";
import { SoundToggle } from "./SoundToggle.js";
import { useSound, useSoundEnabled, useSoundStatus } from "./use-sound.js";
import { SOUND_STORAGE_KEY } from "./types.js";

function Toggleish() {
	const enabled = useSoundEnabled();
	const status = useSoundStatus();
	return (
		<button type="button" data-state={enabled ? "on" : "off"} data-engine={status.engine}>
			{enabled ? "Sound on" : "Sound off"}
		</button>
	);
}

function Lab() {
	const { enabled, volume, theme } = useSound();
	// One interpolation, not three: React's server renderer separates adjacent
	// text nodes with `<!-- -->` markers, which would make the HTML assertion
	// below about React's text protocol rather than about the store.
	return <p data-testid="lab">{`${String(enabled)}/${String(volume)}/${theme}`}</p>;
}

function storeEnabled(volume = 0.75) {
	window.localStorage.setItem(
		SOUND_STORAGE_KEY,
		JSON.stringify({ v: 1, enabled: true, volume, theme: "fancy" })
	);
}

/**
 * Server-renders `ui`, hydrates that exact HTML, and returns the live
 * container plus everything React reported while doing it. Teardown is
 * registered rather than returned: a failed assertion must not strand a
 * mounted subscriber for the next test to wake.
 *
 * `recoverable` is the load-bearing half. React 19 routes a hydration
 * mismatch to `onRecoverableError`, NOT to `console.error`, so a suite that
 * only watches the console spy would go green on a real mismatch.
 */
const teardowns: Array<() => void> = [];

function hydrate(ui: ReactElement) {
	const html = renderToString(ui);
	const container = document.createElement("div");
	container.innerHTML = html;
	document.body.appendChild(container);

	const recoverable: unknown[] = [];
	let root!: ReturnType<typeof hydrateRoot>;
	act(() => {
		root = hydrateRoot(container, ui, {
			onRecoverableError: (error) => {
				recoverable.push(error);
			},
		});
	});

	teardowns.push(() => {
		act(() => {
			root.unmount();
		});
		container.remove();
	});

	return { html, container, recoverable };
}

function spyOnConsoleError() {
	return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("sound — hydration", () => {
	let errors: ReturnType<typeof spyOnConsoleError>;

	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
		errors = spyOnConsoleError();
	});

	afterEach(() => {
		for (const teardown of teardowns.splice(0)) teardown();
		errors.mockRestore();
		resetSoundForTests();
		window.localStorage.clear();
		document.body.innerHTML = "";
	});

	it("hydrates a stored-on preference with no console error and no DOM-shape change", () => {
		storeEnabled();

		const { html, container, recoverable } = hydrate(<Toggleish />);

		// The server never learns the stored preference.
		expect(html).toContain('data-state="off"');
		expect(html).toContain("Sound off");

		// …and the client agrees, right up until the hydration effect runs.
		expect(recoverable).toEqual([]);
		expect(errors).not.toHaveBeenCalled();

		const button = container.querySelector("button");
		expect(button).not.toBeNull();
		expect(button?.dataset.state).toBe("on");
		expect(button?.textContent).toBe("Sound on");
	});

	it("hydrates the full store hook with no console error", () => {
		storeEnabled(0.25);

		const { html, container, recoverable } = hydrate(<Lab />);

		expect(html).toContain("false/0.5/fancy");
		expect(recoverable).toEqual([]);
		expect(errors).not.toHaveBeenCalled();
		expect(container.querySelector("[data-testid=lab]")?.textContent).toBe("true/0.25/fancy");
	});

	it("hydrates cleanly when nothing is stored at all", () => {
		const { container, recoverable } = hydrate(<Toggleish />);

		expect(recoverable).toEqual([]);
		expect(errors).not.toHaveBeenCalled();
		expect(container.querySelector("button")?.dataset.state).toBe("off");
	});

	it("hydrates cleanly under StrictMode", () => {
		storeEnabled();

		const { container, recoverable } = hydrate(
			<StrictMode>
				<Toggleish />
			</StrictMode>
		);

		expect(recoverable).toEqual([]);
		expect(errors).not.toHaveBeenCalled();
		expect(container.querySelector("button")?.dataset.state).toBe("on");
	});

	/**
	 * The server-markup contract of the real component, asserted where its CSS
	 * import and a populated `localStorage` both exist. `sound.ssr.test.ts`
	 * makes the same claim in the DOM-less node environment; this one adds the
	 * half that only a browser environment can pose — storage already holds
	 * "on" and the server pass must still emit "off".
	 */
	it("server-renders SoundToggle as off even with a stored-on preference", () => {
		storeEnabled();

		const html = renderToString(<SoundToggle />);

		expect(html).toContain('role="switch"');
		expect(html).toContain('aria-checked="false"');
		expect(html).toContain('data-state="off"');
		expect(html).toContain("data-sound-toggle");
		expect(html).toContain('aria-label="Sound"');
		expect(html).not.toContain('aria-checked="true"');
		// Both glyphs are in the markup, so hydration only changes CSS state.
		expect(html).toContain("ft-sound-toggle-glyph-on");
		expect(html).toContain("ft-sound-toggle-glyph-off");
	});

	it("hydrates the real SoundToggle to the stored preference with no console error", () => {
		storeEnabled();

		const { html, container, recoverable } = hydrate(<SoundToggle />);

		expect(html).toContain('data-state="off"');
		expect(recoverable).toEqual([]);
		expect(errors).not.toHaveBeenCalled();

		const button = container.querySelector("button");
		expect(button?.dataset.state).toBe("on");
		expect(button?.getAttribute("aria-checked")).toBe("true");
		// The accessible name never announces the state — aria-checked does.
		expect(button?.getAttribute("aria-label")).toBe("Sound");
	});

	it("never reads storage during the render pass itself", () => {
		storeEnabled();
		const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
		try {
			renderToString(<Toggleish />);
			expect(getItemSpy).not.toHaveBeenCalled();
		} finally {
			getItemSpy.mockRestore();
		}
	});
});
