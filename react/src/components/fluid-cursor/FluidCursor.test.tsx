import { StrictMode } from "react";
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { FluidCursor } from "./FluidCursor.js";

describe("FluidCursor", () => {
	afterEach(cleanup);

	it("renders a container div", () => {
		const { container } = render(<FluidCursor />);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it("renders a canvas element", () => {
		const { container } = render(<FluidCursor />);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("container has pointer-events-none class", () => {
		const { container } = render(<FluidCursor />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("pointer-events-none");
	});

	it("defaults to contained mode (absolute positioning)", () => {
		const { container } = render(<FluidCursor />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("absolute");
		expect(div?.className).toContain("inset-0");
	});

	it("canvas fills container in contained mode", () => {
		const { container } = render(<FluidCursor />);
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas?.className).toContain("h-full");
		expect(canvas?.className).toContain("w-full");
	});

	it("uses fixed positioning when contained={false}", () => {
		const { container } = render(<FluidCursor contained={false} />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("fixed");
		expect(div?.className).toContain("z-50");
	});

	it("applies custom class names", () => {
		const { container } = render(<FluidCursor className="my-fluid" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-fluid");
	});

	describe("interaction props", () => {
		it("interactive={false} does not register mouse event listeners", () => {
			const addSpy = vi.spyOn(window, "addEventListener");
			render(<FluidCursor interactive={false} />);
			const mousedownCalls = addSpy.mock.calls.filter(([event]) => event === "mousedown");
			expect(mousedownCalls).toHaveLength(0);
			const mousemoveCalls = addSpy.mock.calls.filter(([event]) => event === "mousemove");
			expect(mousemoveCalls).toHaveLength(0);
			addSpy.mockRestore();
		});

		it("mounts without error with autoSplat={true} and splatOnMount={true}", () => {
			const { container } = render(<FluidCursor autoSplat splatOnMount />);
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("pauseWhenHidden={false} does not instantiate IntersectionObserver", () => {
			const observeSpy = vi.fn();
			const mockObserver = vi.fn(() => ({ observe: observeSpy, disconnect: vi.fn() }));
			vi.stubGlobal("IntersectionObserver", mockObserver);
			render(<FluidCursor pauseWhenHidden={false} />);
			expect(mockObserver).not.toHaveBeenCalled();
			vi.unstubAllGlobals();
		});
	});

	describe("hdr props", () => {
		it("renders without error with hdr={true} when WebGPU is unavailable", () => {
			const { container } = render(<FluidCursor hdr />);
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("renders without error when hdrBoost is out of [1,4] range (clamped internally)", () => {
			const { container } = render(<FluidCursor hdr hdrBoost={100} />);
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("falls back cleanly when WebGPU is present but no adapter is returned", async () => {
			const requestAdapter = vi.fn(async () => null);
			// Define `gpu` on the real navigator instead of replacing it, so the
			// Navigator prototype (userAgent, etc.) stays intact.
			Object.defineProperty(navigator, "gpu", {
				value: { requestAdapter },
				configurable: true,
			});
			try {
				const { container } = render(<FluidCursor hdr />);
				// Let the async WebGPU attempt resolve and fall back.
				await new Promise((resolve) => setTimeout(resolve, 0));
				expect(requestAdapter).toHaveBeenCalled();
				expect(container.querySelector("canvas")).toBeInTheDocument();
			} finally {
				delete (navigator as unknown as Record<string, unknown>).gpu;
			}
		});
	});

	describe("dither props", () => {
		it("renders without error with dither={true}", () => {
			const { container } = render(<FluidCursor dither />);
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("renders without error when dither values are out of range (clamped internally)", () => {
			const { container } = render(<FluidCursor dither ditherPixelSize={0} ditherLevels={100} />);
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("does not attempt WebGPU when dither and hdr are both set", async () => {
			const requestAdapter = vi.fn(async () => null);
			Object.defineProperty(navigator, "gpu", {
				value: { requestAdapter },
				configurable: true,
			});
			try {
				const { container } = render(<FluidCursor dither hdr />);
				await new Promise((resolve) => setTimeout(resolve, 0));
				expect(requestAdapter).not.toHaveBeenCalled();
				expect(container.querySelector("canvas")).toBeInTheDocument();
			} finally {
				delete (navigator as unknown as Record<string, unknown>).gpu;
			}
		});
	});

	describe("color props", () => {
		it("renders without error when fluidColor is provided", () => {
			const { container } = render(<FluidCursor fluidColor="#00ffcc" />);
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("renders without error when fluidColors is provided", () => {
			const { container } = render(<FluidCursor fluidColors={["#ff0080", "#00ffcc", "#7700ff"]} />);
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("renders without error when fluidColor and fluidColors are both provided (fluidColor takes priority)", () => {
			const { container } = render(
				<FluidCursor fluidColor="#ff0000" fluidColors={["#00ffcc", "#7700ff"]} />
			);
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("renders without error when backColor is a hex string", () => {
			const { container } = render(<FluidCursor backColor="#1a1a2e" />);
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("warns and falls back when an invalid hex string is passed to backColor", () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			render(<FluidCursor backColor="not-a-color" />);
			expect(warn).toHaveBeenCalledWith(expect.stringContaining("[FluidCursor] Invalid hex color"));
			warn.mockRestore();
		});

		it("renders without error when colorIntensity is out of [0,1] range (clamped internally)", () => {
			const { container } = render(<FluidCursor colorIntensity={5} />);
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});
	});

	describe("onReady handle", () => {
		// jsdom provides no WebGL context, so this exercises the no-renderer path.
		it('reports renderLevel "none" when no renderer is available', () => {
			const onReady = vi.fn();
			render(<FluidCursor onReady={onReady} />);
			expect(onReady).toHaveBeenCalledTimes(1);
			expect(onReady.mock.calls[0]![0].renderLevel).toBe("none");
		});

		it("hands over an inert handle that is safe to call", () => {
			const onReady = vi.fn();
			render(<FluidCursor onReady={onReady} />);
			const handle = onReady.mock.calls[0]![0];
			expect(() => {
				handle.moveTo(0.5, 0.5);
				handle.penUp();
				handle.burst(0.5, 0.5, 10, 10, { r: 1, g: 0, b: 0 });
			}).not.toThrow();
		});
	});
});

// A minimal fake WebGL2 context: jsdom has none, so the GL path is otherwise
// never exercised. Every allocation is tracked so a test can assert that the
// engine hands its objects back when the effect is cleaned up.
const GL_KINDS = ["texture", "framebuffer", "program", "shader", "buffer"] as const;
type GlKind = (typeof GL_KINDS)[number];

interface FakeGl {
	gl: WebGL2RenderingContext;
	live: Record<GlKind, Set<object>>;
	deleted: Record<GlKind, number>;
}

function createFakeGl(): FakeGl {
	const live: Record<GlKind, Set<object>> = {
		texture: new Set(),
		framebuffer: new Set(),
		program: new Set(),
		shader: new Set(),
		buffer: new Set(),
	};
	const deleted: Record<GlKind, number> = {
		texture: 0,
		framebuffer: 0,
		program: 0,
		shader: 0,
		buffer: 0,
	};

	const constants = new Map<string, number>();
	let nextConstant = 0x1000;
	let nextId = 1;
	const constant = (name: string) => {
		let value = constants.get(name);
		if (value === undefined) {
			value = nextConstant++;
			constants.set(name, value);
		}
		return value;
	};

	const create = (kind: GlKind) => () => {
		const object = { kind, id: nextId++ };
		live[kind].add(object);
		return object;
	};
	const destroy = (kind: GlKind) => (object: object | null) => {
		if (object && live[kind].delete(object)) deleted[kind]++;
	};

	const methods: Record<string, (...args: never[]) => unknown> = {
		createTexture: create("texture"),
		createFramebuffer: create("framebuffer"),
		createProgram: create("program"),
		createShader: create("shader"),
		createBuffer: create("buffer"),
		deleteTexture: destroy("texture"),
		deleteFramebuffer: destroy("framebuffer"),
		deleteProgram: destroy("program"),
		deleteShader: destroy("shader"),
		deleteBuffer: destroy("buffer"),
		getExtension: () => ({ HALF_FLOAT_OES: constant("HALF_FLOAT_OES"), loseContext: () => {} }),
		checkFramebufferStatus: () => constant("FRAMEBUFFER_COMPLETE"),
		getProgramParameter: () => 0,
		getActiveUniform: () => null,
		getUniformLocation: () => null,
	};

	const state: Record<string, unknown> = { drawingBufferWidth: 64, drawingBufferHeight: 64 };
	const gl = new Proxy(state, {
		// Feature probes (`"drawBuffers" in gl`) resolve to the WebGL2 path.
		has: () => true,
		get(target, property) {
			if (typeof property !== "string") return undefined;
			if (property in target) return target[property];
			if (property in methods) return methods[property];
			// Uppercase names are GL enums; everything else is a no-op call.
			if (/^[A-Z][A-Z0-9_]*$/.test(property)) return constant(property);
			return () => undefined;
		},
	}) as unknown as WebGL2RenderingContext;

	return { gl, live, deleted };
}

function stubWebGlContext() {
	const contexts = new Map<HTMLCanvasElement, FakeGl>();
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
		this: HTMLCanvasElement,
		contextId: string
	) {
		if (contextId !== "webgl2" && contextId !== "webgl" && contextId !== "experimental-webgl") {
			return null;
		}
		let fake = contexts.get(this);
		if (!fake) {
			fake = createFakeGl();
			contexts.set(this, fake);
		}
		return fake.gl;
	} as unknown as HTMLCanvasElement["getContext"]);
	return contexts;
}

const countLive = (fake: FakeGl) => GL_KINDS.reduce((total, kind) => total + fake.live[kind].size, 0);

describe("GL resource disposal", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("frees every GL object it allocated when the component unmounts", () => {
		const contexts = stubWebGlContext();
		const { container, unmount } = render(<FluidCursor />);
		const fake = contexts.get(container.querySelector("canvas")!)!;

		expect(countLive(fake)).toBeGreaterThan(0);

		unmount();

		expect(countLive(fake)).toBe(0);
		for (const kind of GL_KINDS) {
			expect(fake.deleted[kind]).toBeGreaterThan(0);
		}
	});

	it("does not double the GPU allocation when StrictMode mounts the effect twice", () => {
		const plainContexts = stubWebGlContext();
		const plain = render(<FluidCursor />);
		const plainLive = countLive(plainContexts.get(plain.container.querySelector("canvas")!)!);
		plain.unmount();

		const strictContexts = stubWebGlContext();
		const strict = render(<FluidCursor />, { wrapper: StrictMode });
		const strictFake = strictContexts.get(strict.container.querySelector("canvas")!)!;

		// Both effect passes share the one canvas — and therefore the one
		// context — so the first pass's cleanup must have freed its own set
		// before the second pass allocated its own.
		expect(strictFake.deleted.framebuffer).toBeGreaterThan(0);
		expect(strictFake.deleted.texture).toBeGreaterThan(0);
		expect(strictFake.deleted.program).toBeGreaterThan(0);
		expect(countLive(strictFake)).toBeLessThanOrEqual(plainLive);

		strict.unmount();
		expect(countLive(strictFake)).toBe(0);
	});

	it("cancels the splatOnMount arc chain when the component unmounts", () => {
		stubWebGlContext();
		const frameIds: number[] = [];
		let nextFrameId = 0;
		vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => {
			const id = ++nextFrameId;
			frameIds.push(id);
			return id;
		});
		const cancel = vi.spyOn(window, "cancelAnimationFrame");

		const { unmount } = render(<FluidCursor splatOnMount />);
		// The frame loop schedules itself first, the arc chain second.
		expect(frameIds.length).toBeGreaterThan(1);
		const splatFrameId = frameIds[frameIds.length - 1]!;

		unmount();

		expect(cancel).toHaveBeenCalledWith(splatFrameId);
	});
});
