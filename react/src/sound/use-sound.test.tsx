/**
 * The React bindings. Two contracts are under test: `useSoundCue` plays and
 * never subscribes, and the three store hooks subscribe, hydrate from an
 * effect, and re-render only for the slice they actually read.
 */
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSoundSnapshot, resetSoundForTests, sound } from "./sound.js";
import {
	useSound,
	useSoundCue,
	useSoundEnabled,
	useSoundEngineState,
	useSoundStatus,
} from "./use-sound.js";
import { SOUND_STORAGE_KEY, type SoundCue, type SoundPlayOptions } from "./types.js";
import { installFakeAudioContext } from "./web-audio-mock.js";

function storeEnabled(volume = 0.25) {
	window.localStorage.setItem(
		SOUND_STORAGE_KEY,
		JSON.stringify({ v: 1, enabled: true, volume, theme: "fancy" })
	);
}

function Enabled() {
	const enabled = useSoundEnabled();
	return <span data-testid="enabled">{String(enabled)}</span>;
}

describe("useSoundCue", () => {
	const play = vi.fn<(cue: SoundCue, options?: SoundPlayOptions) => void>();

	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
		play.mockClear();
		vi.spyOn(sound, "play").mockImplementation(play);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		resetSoundForTests();
		window.localStorage.clear();
	});

	it("plays the cue through the controller while enabled", () => {
		const { result } = renderHook(() => useSoundCue(true));

		result.current("press", { volume: 0.5 });

		expect(play).toHaveBeenCalledWith("press", { volume: 0.5 });
	});

	it("is a no-op while `enabled` is falsy", () => {
		const { result: off } = renderHook(() => useSoundCue(false));
		const { result: unset } = renderHook(() => useSoundCue(undefined));

		off.current("press");
		unset.current("press");

		expect(play).not.toHaveBeenCalled();
	});

	it("keeps one identity across re-renders while tracking the latest `enabled`", () => {
		const { result, rerender } = renderHook(({ enabled }) => useSoundCue(enabled), {
			initialProps: { enabled: false },
		});
		const first = result.current;

		rerender({ enabled: true });
		expect(result.current).toBe(first);

		first("press");
		expect(play).toHaveBeenCalledTimes(1);

		rerender({ enabled: false });
		first("press");
		expect(play).toHaveBeenCalledTimes(1);
	});

	it("does not subscribe — a preference change elsewhere never re-renders the consumer", () => {
		let renders = 0;
		function Probe() {
			renders += 1;
			useSoundCue(true);
			return <span data-testid="probe" />;
		}

		render(<Probe />);
		const initial = renders;

		act(() => {
			sound.setVolume(0.9);
			sound.setEnabled(true);
		});

		expect(renders).toBe(initial);
	});

	it("reads no storage of its own — hydration happens inside play(), at gesture time", () => {
		const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
		renderHook(() => useSoundCue(true));
		expect(getItemSpy).not.toHaveBeenCalled();
	});
});

describe("useSoundEnabled", () => {
	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		resetSoundForTests();
		window.localStorage.clear();
	});

	it("renders the default on the first pass, then the stored preference after the effect", () => {
		storeEnabled();
		const seen: boolean[] = [];
		function Probe() {
			const enabled = useSoundEnabled();
			seen.push(enabled);
			return <span data-testid="enabled">{String(enabled)}</span>;
		}

		render(<Probe />);

		expect(seen[0]).toBe(false);
		expect(screen.getByTestId("enabled")).toHaveTextContent("true");
	});

	it("tracks later preference changes", () => {
		render(<Enabled />);
		expect(screen.getByTestId("enabled")).toHaveTextContent("false");

		act(() => {
			sound.enable();
		});
		expect(screen.getByTestId("enabled")).toHaveTextContent("true");

		act(() => {
			sound.disable();
		});
		expect(screen.getByTestId("enabled")).toHaveTextContent("false");
	});

	it("does not re-render for a change that leaves `enabled` alone", () => {
		let renders = 0;
		function Probe() {
			renders += 1;
			useSoundEnabled();
			return <span data-testid="probe" />;
		}

		render(<Probe />);
		const initial = renders;

		act(() => {
			sound.setVolume(0.3);
		});

		expect(sound.volume).toBe(0.3);
		expect(renders).toBe(initial);
	});

	it("hydrates exactly once no matter how many store hooks are mounted", () => {
		storeEnabled();
		const getItemSpy = vi.spyOn(Storage.prototype, "getItem");

		function Probe() {
			useSoundEnabled();
			useSoundStatus();
			useSound();
			return <span data-testid="probe" />;
		}

		render(
			<>
				<Probe />
				<Probe />
			</>
		);

		expect(getItemSpy).toHaveBeenCalledTimes(1);
	});
});

describe("useSoundStatus", () => {
	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		resetSoundForTests();
		window.localStorage.clear();
	});

	it("returns the identity-cached status object and keeps it across re-renders", () => {
		const { result, rerender } = renderHook(() => useSoundStatus());
		const first = result.current;

		rerender();

		expect(result.current).toBe(first);
		expect(result.current).toBe(getSoundSnapshot().status);
	});

	it("re-renders with a new status object when the status moves", () => {
		const { result } = renderHook(() => useSoundStatus());
		const first = result.current;

		act(() => {
			sound.setVolume(0.75);
		});

		expect(result.current).not.toBe(first);
		expect(result.current.volume).toBe(0.75);
	});

	it("reports the storage outcome once hydration has run", () => {
		const { result } = renderHook(() => useSoundStatus());
		expect(result.current.storage).toBe("ok");
	});
});

describe("useSoundEngineState", () => {
	let audio: { restore(): void };

	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
		audio = installFakeAudioContext(window as unknown as Record<string, unknown>);
	});

	afterEach(() => {
		cleanup();
		audio.restore();
		vi.restoreAllMocks();
		resetSoundForTests();
		window.localStorage.clear();
	});

	it("reports the engine state and tracks it", async () => {
		const { result } = renderHook(() => useSoundEngineState());
		expect(result.current).toBe("idle");

		await act(async () => {
			sound.enable();
			await sound.unlock();
		});

		expect(result.current).toBe("ready");
	});

	it("does not re-render for a cue played anywhere on the page", async () => {
		let renders = 0;
		function Probe() {
			renders += 1;
			useSoundEngineState();
			return <span data-testid="probe" />;
		}

		render(<Probe />);
		await act(async () => {
			sound.enable();
			await sound.unlock();
		});
		const initial = renders;

		act(() => {
			sound.play("press");
		});

		// The cue really landed — the status moved, and this reader still did not.
		expect(getSoundSnapshot().status.lastCue).toBe("press");
		expect(renders).toBe(initial);
	});

	it("is the difference: the whole-status reader DOES re-render on that cue", async () => {
		let renders = 0;
		function Probe() {
			renders += 1;
			useSoundStatus();
			return <span data-testid="probe" />;
		}

		render(<Probe />);
		await act(async () => {
			sound.enable();
			await sound.unlock();
		});
		const initial = renders;

		act(() => {
			sound.play("press");
		});

		expect(renders).toBeGreaterThan(initial);
	});
});

describe("useSound", () => {
	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		resetSoundForTests();
		window.localStorage.clear();
	});

	it("exposes the snapshot alongside the controls", () => {
		const { result } = renderHook(() => useSound());

		expect(result.current.enabled).toBe(false);
		expect(result.current.volume).toBe(0.5);
		expect(result.current.theme).toBe("fancy");
		expect(result.current.status.storage).toBe("ok");
		for (const key of [
			"play",
			"unlock",
			"enable",
			"disable",
			"toggle",
			"setEnabled",
			"setVolume",
			"setTheme",
		] as const) {
			expect(result.current[key]).toBeTypeOf("function");
		}
	});

	it("keeps one object identity while nothing changes", () => {
		const { result, rerender } = renderHook(() => useSound());
		const first = result.current;

		rerender();
		expect(result.current).toBe(first);

		act(() => {
			sound.setVolume(0.1);
		});
		expect(result.current).not.toBe(first);
		expect(result.current.volume).toBe(0.1);
	});

	it("delegates every control to the live controller at call time", () => {
		const { result } = renderHook(() => useSound());
		const enable = vi.spyOn(sound, "enable").mockImplementation(() => {});
		const disable = vi.spyOn(sound, "disable").mockImplementation(() => {});
		const toggle = vi.spyOn(sound, "toggle").mockImplementation(() => true);
		const setEnabled = vi.spyOn(sound, "setEnabled").mockImplementation(() => {});
		const setVolume = vi.spyOn(sound, "setVolume").mockImplementation(() => {});
		const setTheme = vi.spyOn(sound, "setTheme").mockImplementation(() => {});
		const play = vi.spyOn(sound, "play").mockImplementation(() => {});
		const unlock = vi.spyOn(sound, "unlock").mockResolvedValue(true);

		result.current.enable();
		result.current.disable();
		expect(result.current.toggle()).toBe(true);
		result.current.setEnabled(true);
		result.current.setVolume(0.2);
		result.current.setTheme("fancy");
		result.current.play("press", { pitch: 2 });
		void result.current.unlock();

		expect(enable).toHaveBeenCalledTimes(1);
		expect(disable).toHaveBeenCalledTimes(1);
		expect(toggle).toHaveBeenCalledTimes(1);
		expect(setEnabled).toHaveBeenCalledWith(true);
		expect(setVolume).toHaveBeenCalledWith(0.2);
		expect(setTheme).toHaveBeenCalledWith("fancy");
		expect(play).toHaveBeenCalledWith("press", { pitch: 2 });
		expect(unlock).toHaveBeenCalledTimes(1);
	});

	it("re-renders every subscriber when a preference changes", () => {
		const a = renderHook(() => useSound());
		const b = renderHook(() => useSoundEnabled());

		act(() => {
			sound.enable();
		});

		expect(a.result.current.enabled).toBe(true);
		expect(b.result.current).toBe(true);
	});

	it("unsubscribes on unmount", () => {
		const { unmount } = renderHook(() => useSound());
		unmount();

		expect(() => {
			sound.setVolume(0.42);
		}).not.toThrow();
		expect(getSoundSnapshot().volume).toBe(0.42);
	});
});
