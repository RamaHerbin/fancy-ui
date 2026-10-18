/**
 * Pure, dependency-free fakes for the Web Audio surface the sound engine uses.
 *
 * Imports nothing — no vitest — so it is safe to sit beside the engine it
 * fakes: it is not exported from the barrel, it is never executed at runtime,
 * and keeping it inside the folder means the colocated tests never reach
 * outside the package root for it.
 */

export type AutomationMethod =
	| "setValueAtTime"
	| "linearRampToValueAtTime"
	| "exponentialRampToValueAtTime"
	| "setTargetAtTime"
	| "cancelScheduledValues";

export interface AutomationEvent {
	method: AutomationMethod;
	value: number;
	time: number;
	timeConstant?: number;
}

export class FakeAudioParam {
	value: number;
	readonly events: AutomationEvent[] = [];
	constructor(value = 0) {
		this.value = value;
	}
	setValueAtTime(value: number, time: number): this {
		this.events.push({ method: "setValueAtTime", value, time });
		this.value = value;
		return this;
	}
	linearRampToValueAtTime(value: number, time: number): this {
		this.events.push({ method: "linearRampToValueAtTime", value, time });
		return this;
	}
	exponentialRampToValueAtTime(value: number, time: number): this {
		this.events.push({ method: "exponentialRampToValueAtTime", value, time });
		return this;
	}
	setTargetAtTime(value: number, time: number, timeConstant: number): this {
		this.events.push({ method: "setTargetAtTime", value, time, timeConstant });
		return this;
	}
	cancelScheduledValues(time: number): this {
		this.events.push({ method: "cancelScheduledValues", value: this.value, time });
		return this;
	}
}

export class FakeAudioNode {
	readonly context: FakeAudioContext;
	readonly outputs: FakeAudioNode[] = [];
	disconnected = false;
	constructor(context: FakeAudioContext) {
		this.context = context;
		context.allNodes.push(this);
	}
	connect(node: FakeAudioNode): FakeAudioNode {
		this.outputs.push(node);
		return node;
	}
	disconnect(): void {
		this.outputs.length = 0;
		this.disconnected = true;
	}
}

export class FakeGainNode extends FakeAudioNode {
	readonly gain = new FakeAudioParam(1);
}

export class FakeBiquadFilterNode extends FakeAudioNode {
	type: BiquadFilterType = "lowpass";
	readonly frequency = new FakeAudioParam(350);
	readonly Q = new FakeAudioParam(1);
	readonly detune = new FakeAudioParam(0);
	readonly gain = new FakeAudioParam(0);
}

export class FakeDynamicsCompressorNode extends FakeAudioNode {
	readonly threshold = new FakeAudioParam(-24);
	readonly knee = new FakeAudioParam(30);
	readonly ratio = new FakeAudioParam(12);
	readonly attack = new FakeAudioParam(0.003);
	readonly release = new FakeAudioParam(0.25);
}

export class FakeAudioBuffer {
	readonly numberOfChannels: number;
	readonly length: number;
	readonly sampleRate: number;
	private readonly channels: Float32Array[];
	constructor(numberOfChannels: number, length: number, sampleRate: number) {
		this.numberOfChannels = numberOfChannels;
		this.length = length;
		this.sampleRate = sampleRate;
		this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
	}
	get duration(): number {
		return this.length / this.sampleRate;
	}
	getChannelData(channel: number): Float32Array {
		// noUncheckedIndexedAccess (this workspace's tsconfig only) types the index
		// as possibly undefined; the class's own constructor always fills every
		// channel slot, so this assertion changes nothing observable.
		return this.channels[channel]!;
	}
}

export class FakeScheduledSource extends FakeAudioNode {
	startTime: number | null = null;
	/** Second argument of `start()` — the buffer offset for AudioBufferSourceNode. */
	startOffset: number | null = null;
	stopTime: number | null = null;
	onended: (() => void) | null = null;
	ended = false;
	start(when = 0, offset?: number): void {
		this.startTime = when;
		this.startOffset = offset ?? null;
	}
	stop(when = 0): void {
		this.stopTime = when;
	}
	/** Test helper: simulate the source reaching its stop time. */
	fireEnded(): void {
		if (this.ended) return;
		this.ended = true;
		this.onended?.();
	}
}

export class FakeOscillatorNode extends FakeScheduledSource {
	type: OscillatorType = "sine";
	readonly frequency = new FakeAudioParam(440);
	readonly detune = new FakeAudioParam(0);
}

export class FakeBufferSourceNode extends FakeScheduledSource {
	buffer: FakeAudioBuffer | null = null;
	loop = false;
	readonly playbackRate = new FakeAudioParam(1);
}

export interface FakeAudioContextOptions {
	/** Default "running". Real browsers often start "suspended" before a gesture. */
	initialState?: AudioContextState;
	/** What resume() does: "resolve" (→ running), "reject" (throws), "pending" (never settles). Default "resolve". */
	resume?: "resolve" | "reject" | "pending";
	/** Throw from the constructor (simulates a browser refusing a context). */
	throwOnConstruct?: boolean;
	sampleRate?: number;
	/** Omit createDynamicsCompressor to simulate an engine that lacks it. */
	withoutCompressor?: boolean;
}

export class FakeAudioContext {
	state: AudioContextState;
	currentTime = 0;
	readonly sampleRate: number;
	readonly destination: FakeAudioNode;
	readonly allNodes: FakeAudioNode[] = [];
	readonly created = {
		gains: [] as FakeGainNode[],
		oscillators: [] as FakeOscillatorNode[],
		sources: [] as FakeBufferSourceNode[],
		filters: [] as FakeBiquadFilterNode[],
		compressors: [] as FakeDynamicsCompressorNode[],
		buffers: [] as FakeAudioBuffer[],
	};
	resumeCalls = 0;
	suspendCalls = 0;
	closeCalls = 0;
	private readonly options: FakeAudioContextOptions;
	private readonly listeners = new Set<() => void>();
	// Assigned via a property so `delete` can simulate its absence.
	createDynamicsCompressor?: () => FakeDynamicsCompressorNode;

	constructor(options: FakeAudioContextOptions = {}) {
		if (options.throwOnConstruct) throw new Error("AudioContext refused");
		this.options = options;
		this.state = options.initialState ?? "running";
		this.sampleRate = options.sampleRate ?? 48000;
		this.destination = new FakeAudioNode(this);
		// destination is not a "created" node
		this.allNodes.length = 0;
		if (!options.withoutCompressor) {
			this.createDynamicsCompressor = () => {
				const n = new FakeDynamicsCompressorNode(this);
				this.created.compressors.push(n);
				return n;
			};
		}
	}

	createGain(): FakeGainNode {
		const n = new FakeGainNode(this);
		this.created.gains.push(n);
		return n;
	}
	createOscillator(): FakeOscillatorNode {
		const n = new FakeOscillatorNode(this);
		this.created.oscillators.push(n);
		return n;
	}
	createBufferSource(): FakeBufferSourceNode {
		const n = new FakeBufferSourceNode(this);
		this.created.sources.push(n);
		return n;
	}
	createBiquadFilter(): FakeBiquadFilterNode {
		const n = new FakeBiquadFilterNode(this);
		this.created.filters.push(n);
		return n;
	}
	createBuffer(channels: number, length: number, sampleRate: number): FakeAudioBuffer {
		const b = new FakeAudioBuffer(channels, length, sampleRate);
		this.created.buffers.push(b);
		return b;
	}

	resume(): Promise<void> {
		this.resumeCalls++;
		const mode = this.options.resume ?? "resolve";
		if (mode === "pending") return new Promise<void>(() => {});
		if (mode === "reject") return Promise.reject(new Error("resume rejected"));
		if (this.state !== "closed") this.setState("running");
		return Promise.resolve();
	}
	suspend(): Promise<void> {
		this.suspendCalls++;
		if (this.state !== "closed") this.setState("suspended");
		return Promise.resolve();
	}
	close(): Promise<void> {
		this.closeCalls++;
		this.setState("closed");
		return Promise.resolve();
	}

	addEventListener(_type: "statechange", cb: () => void): void {
		this.listeners.add(cb);
	}
	removeEventListener(_type: "statechange", cb: () => void): void {
		this.listeners.delete(cb);
	}
	get onstatechange(): null {
		return null;
	}

	/** Test helper: sets `state` and dispatches statechange. */
	setState(next: AudioContextState): void {
		this.state = next;
		for (const cb of [...this.listeners]) cb();
	}

	/** Test helper: advances currentTime and fires `onended` on every source whose stopTime has passed. */
	advance(seconds: number): void {
		this.currentTime += seconds;
		const sources: FakeScheduledSource[] = [...this.created.oscillators, ...this.created.sources];
		for (const s of sources) {
			if (!s.ended && s.stopTime !== null && s.stopTime <= this.currentTime) s.fireEnded();
		}
	}

	/** Every created node not yet disconnected (leak assertions). Excludes `destination`. */
	liveNodes(): FakeAudioNode[] {
		return this.allNodes.filter((n) => !n.disconnected);
	}
}

export interface InstallOptions extends FakeAudioContextOptions {
	/** Install only `webkitAudioContext` to exercise the prefixed fallback. */
	webkitOnly?: boolean;
}

/**
 * Installs a FakeAudioContext constructor as `AudioContext` (and/or
 * `webkitAudioContext`) on `target`. Returns every instance constructed and a
 * `restore()` that puts the previous globals back.
 */
export function installFakeAudioContext(
	target: Record<string, unknown> = globalThis as unknown as Record<string, unknown>,
	options: InstallOptions = {}
): { instances: FakeAudioContext[]; restore(): void } {
	const instances: FakeAudioContext[] = [];
	const { webkitOnly, ...ctxOptions } = options;
	class InstalledAudioContext extends FakeAudioContext {
		constructor() {
			super(ctxOptions);
			instances.push(this);
		}
	}
	const prevStd = Object.getOwnPropertyDescriptor(target, "AudioContext");
	const prevWebkit = Object.getOwnPropertyDescriptor(target, "webkitAudioContext");
	const define = (key: string, value: unknown) =>
		Object.defineProperty(target, key, { value, configurable: true, writable: true });
	if (webkitOnly) {
		define("AudioContext", undefined);
		define("webkitAudioContext", InstalledAudioContext);
	} else {
		define("AudioContext", InstalledAudioContext);
		define("webkitAudioContext", InstalledAudioContext);
	}
	return {
		instances,
		restore() {
			for (const [key, prev] of [
				["AudioContext", prevStd],
				["webkitAudioContext", prevWebkit],
			] as const) {
				if (prev) Object.defineProperty(target, key, prev);
				else delete target[key];
			}
		},
	};
}
