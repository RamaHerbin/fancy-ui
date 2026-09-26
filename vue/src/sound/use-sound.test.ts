/**
 * The composition bindings. Two contracts are under test: `useSoundCue` plays
 * and never tracks, and the three reading composables track the fields they
 * render, hydrate from `onMounted`, and wake only for the slice they read.
 *
 * Transposed from the React package's `use-sound.test.tsx`; the Svelte package
 * has no counterpart, because a Svelte component reads the controller's runes
 * directly.
 */
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, h, nextTick, ref, type Ref } from "vue";
import { hydrateSound, resetSoundForTests, sound } from "./sound.js";
import { useSound, useSoundCue, useSoundEnabled, useSoundStatus } from "./use-sound.js";
import { SOUND_STORAGE_KEY, type SoundCue, type SoundPlayOptions } from "./types.js";
import { installFakeAudioContext } from "./web-audio-mock.js";

function storeEnabled(volume = 0.25) {
	window.localStorage.setItem(
		SOUND_STORAGE_KEY,
		JSON.stringify({ v: 1, enabled: true, volume, theme: "fancy" })
	);
}

/** Mounts `setup` inside a throwaway component and hands back what it returned. */
function mountSetup<T>(setup: () => T): { value: T; unmount(): void; renders(): number } {
	let value!: T;
	let renders = 0;
	const wrapper = mount(
		defineComponent({
			setup() {
				value = setup();
				return () => {
					renders += 1;
					return h("span");
				};
			},
		})
	);
	return {
		get value() {
			return value;
		},
		unmount: () => wrapper.unmount(),
		renders: () => renders,
	};
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
		vi.restoreAllMocks();
		resetSoundForTests();
		window.localStorage.clear();
	});

	it("plays the cue through the controller while enabled", () => {
		const probe = mountSetup(() => useSoundCue(() => true));

		probe.value("press", { volume: 0.5 });

		expect(play).toHaveBeenCalledWith("press", { volume: 0.5 });
		probe.unmount();
	});

	it("is a no-op while `enabled` is falsy", () => {
		const off = mountSetup(() => useSoundCue(() => false));
		const unset = mountSetup(() => useSoundCue(() => undefined));

		off.value("press");
		unset.value("press");

		expect(play).not.toHaveBeenCalled();
		off.unmount();
		unset.unmount();
	});

	it("accepts a ref as well as a getter, and reads it at call time", () => {
		const enabled: Ref<boolean> = ref(false);
		const probe = mountSetup(() => useSoundCue(enabled));
		const first = probe.value;

		first("press");
		expect(play).not.toHaveBeenCalled();

		enabled.value = true;
		first("press");
		expect(play).toHaveBeenCalledTimes(1);

		enabled.value = false;
		first("press");
		expect(play).toHaveBeenCalledTimes(1);
		probe.unmount();
	});

	it("does not track — a preference change elsewhere never re-renders the consumer", async () => {
		const probe = mountSetup(() => useSoundCue(() => true));
		const initial = probe.renders();

		sound.setVolume(0.9);
		sound.setEnabled(true);
		await nextTick();

		expect(probe.renders()).toBe(initial);
		probe.unmount();
	});

	it("reads no storage of its own — hydration happens inside play(), at gesture time", () => {
		const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
		const probe = mountSetup(() => useSoundCue(() => true));
		expect(getItemSpy).not.toHaveBeenCalled();
		probe.unmount();
	});
});

describe("useSoundEnabled", () => {
	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		resetSoundForTests();
		window.localStorage.clear();
	});

	it("renders the default on the first pass, then the stored preference after mount", async () => {
		storeEnabled();
		const seen: boolean[] = [];
		const wrapper = mount(
			defineComponent({
				setup() {
					const enabled = useSoundEnabled();
					return () => {
						seen.push(enabled.value);
						return h("span", String(enabled.value));
					};
				},
			})
		);

		expect(seen[0]).toBe(false);
		await nextTick();
		expect(wrapper.text()).toBe("true");
		wrapper.unmount();
	});

	it("tracks later preference changes", async () => {
		const wrapper = mount(
			defineComponent({
				setup() {
					const enabled = useSoundEnabled();
					return () => h("span", String(enabled.value));
				},
			})
		);
		expect(wrapper.text()).toBe("false");

		sound.enable();
		await nextTick();
		expect(wrapper.text()).toBe("true");

		sound.disable();
		await nextTick();
		expect(wrapper.text()).toBe("false");
		wrapper.unmount();
	});

	it("does not re-render for a change that leaves `enabled` alone", async () => {
		const probe = mountSetup(() => useSoundEnabled());
		await nextTick();
		const initial = probe.renders();

		sound.setVolume(0.3);
		await nextTick();

		expect(sound.volume).toBe(0.3);
		expect(probe.renders()).toBe(initial);
		probe.unmount();
	});

	it("hydrates exactly once no matter how many readers are mounted", () => {
		storeEnabled();
		const getItemSpy = vi.spyOn(Storage.prototype, "getItem");

		const Probe = defineComponent({
			setup() {
				useSoundEnabled();
				useSoundStatus();
				useSound();
				return () => h("span");
			},
		});
		const a = mount(Probe);
		const b = mount(Probe);

		expect(getItemSpy).toHaveBeenCalledTimes(1);
		a.unmount();
		b.unmount();
	});
});

describe("useSoundStatus", () => {
	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		resetSoundForTests();
		window.localStorage.clear();
	});

	it("returns the stable status view and keeps it across reads", () => {
		const probe = mountSetup(() => useSoundStatus());
		const first = probe.value.value;

		expect(probe.value.value).toBe(first);
		expect(probe.value.value).toBe(sound.status);
		probe.unmount();
	});

	it("reports live fields as the status moves", () => {
		const probe = mountSetup(() => useSoundStatus());

		sound.setVolume(0.75);

		expect(probe.value.value.volume).toBe(0.75);
		probe.unmount();
	});

	it("reports the storage outcome once hydration has run", () => {
		const probe = mountSetup(() => useSoundStatus());
		expect(probe.value.value.storage).toBe("ok");
		probe.unmount();
	});

	it("wakes a reader of one field only for that field", async () => {
		let engineReads = 0;
		const wrapper = mount(
			defineComponent({
				setup() {
					const status = useSoundStatus();
					const engineState = computed(() => {
						engineReads += 1;
						return status.value.engine;
					});
					return () => h("span", engineState.value);
				},
			})
		);
		await nextTick();
		const initial = engineReads;

		sound.setVolume(0.4); // status.volume moves, status.engine does not
		await nextTick();

		expect(engineReads).toBe(initial);
		wrapper.unmount();
	});
});

describe("useSound", () => {
	let audio: { restore(): void };

	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
		audio = installFakeAudioContext(window as unknown as Record<string, unknown>);
	});

	afterEach(() => {
		audio.restore();
		vi.restoreAllMocks();
		resetSoundForTests();
		window.localStorage.clear();
	});

	it("exposes the live state alongside the controls", () => {
		const probe = mountSetup(() => useSound());

		expect(probe.value.enabled).toBe(false);
		expect(probe.value.volume).toBe(0.5);
		expect(probe.value.theme).toBe("fancy");
		expect(probe.value.status.storage).toBe("ok");
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
			expect(probe.value[key]).toBeTypeOf("function");
		}
		probe.unmount();
	});

	it("keeps one object identity for the life of the page", () => {
		const a = mountSetup(() => useSound());
		const b = mountSetup(() => useSound());

		expect(a.value).toBe(b.value);

		sound.setVolume(0.1);
		expect(a.value.volume).toBe(0.1);
		a.unmount();
		b.unmount();
	});

	it("delegates every control to the live controller at call time", () => {
		const probe = mountSetup(() => useSound());
		const enable = vi.spyOn(sound, "enable").mockImplementation(() => {});
		const disable = vi.spyOn(sound, "disable").mockImplementation(() => {});
		const toggle = vi.spyOn(sound, "toggle").mockImplementation(() => true);
		const setEnabled = vi.spyOn(sound, "setEnabled").mockImplementation(() => {});
		const setVolume = vi.spyOn(sound, "setVolume").mockImplementation(() => {});
		const setTheme = vi.spyOn(sound, "setTheme").mockImplementation(() => {});
		const play = vi.spyOn(sound, "play").mockImplementation(() => {});
		const unlock = vi.spyOn(sound, "unlock").mockResolvedValue(true);

		probe.value.enable();
		probe.value.disable();
		expect(probe.value.toggle()).toBe(true);
		probe.value.setEnabled(true);
		probe.value.setVolume(0.2);
		probe.value.setTheme("fancy");
		probe.value.play("press", { pitch: 2 });
		void probe.value.unlock();

		expect(enable).toHaveBeenCalledTimes(1);
		expect(disable).toHaveBeenCalledTimes(1);
		expect(toggle).toHaveBeenCalledTimes(1);
		expect(setEnabled).toHaveBeenCalledWith(true);
		expect(setVolume).toHaveBeenCalledWith(0.2);
		expect(setTheme).toHaveBeenCalledWith("fancy");
		expect(play).toHaveBeenCalledWith("press", { pitch: 2 });
		expect(unlock).toHaveBeenCalledTimes(1);
		probe.unmount();
	});

	it("re-renders every reader when a preference changes", async () => {
		const wrapper = mount(
			defineComponent({
				setup() {
					const store = useSound();
					const enabled = useSoundEnabled();
					return () => h("span", `${String(store.enabled)}-${String(enabled.value)}`);
				},
			})
		);

		sound.enable();
		await nextTick();

		expect(wrapper.text()).toBe("true-true");
		wrapper.unmount();
	});

	it("survives unmount — the singleton outlives every consumer", () => {
		const probe = mountSetup(() => useSound());
		probe.unmount();

		expect(() => {
			sound.setVolume(0.42);
		}).not.toThrow();
		expect(sound.volume).toBe(0.42);
	});

	it("hydrateSound() and the composable's mount hydration are the same, idempotent, read", () => {
		storeEnabled(0.3);
		const getItemSpy = vi.spyOn(Storage.prototype, "getItem");

		hydrateSound();
		const probe = mountSetup(() => useSound());

		expect(getItemSpy).toHaveBeenCalledTimes(1);
		expect(probe.value.volume).toBe(0.3);
		probe.unmount();
	});
});
