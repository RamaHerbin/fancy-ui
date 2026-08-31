// Minimal structural WebGPU types — a port addition.
//
// The reference implementation opens with `/// <reference types="@webgpu/types" />`.
// That package is not a dependency of `fancy-ui-react` and may not be added, and a
// triple-slash reference emitted into the published `.d.ts` would make every
// consumer's `tsc` fail on a type package they never installed. So the exact
// surface `webgpu-renderer.ts` touches is declared here instead: type-only, erased
// at build time, and structurally compatible with the real thing (a consumer who
// DOES have `@webgpu/types` sees no conflict — nothing here is declared globally).
//
// Nothing in this file is exported from the component's `index.ts`: no public API
// mentions a GPU type, so the published declarations stay WebGPU-free.

/** Texture format string (`"rgba16float"` is the only one used here). */
export type GPUTextureFormat = string;
/** Render-pass load operation. */
export type GPULoadOp = "load" | "clear";

export interface GPUTextureView {
	readonly __brand?: "GPUTextureView";
}

export interface GPUTexture {
	createView(): GPUTextureView;
	destroy(): void;
}

export interface GPUBuffer {
	destroy?(): void;
}

export interface GPUSampler {
	readonly __brand?: "GPUSampler";
}
export interface GPUShaderModule {
	readonly __brand?: "GPUShaderModule";
}
export interface GPUBindGroup {
	readonly __brand?: "GPUBindGroup";
}
export interface GPUBindGroupLayout {
	readonly __brand?: "GPUBindGroupLayout";
}
export interface GPUPipelineLayout {
	readonly __brand?: "GPUPipelineLayout";
}
export interface GPURenderPipeline {
	readonly __brand?: "GPURenderPipeline";
}
export interface GPUCommandBuffer {
	readonly __brand?: "GPUCommandBuffer";
}

export interface GPURenderPassEncoder {
	setPipeline(pipeline: GPURenderPipeline): void;
	setBindGroup(index: number, bindGroup: GPUBindGroup): void;
	setVertexBuffer(slot: number, buffer: GPUBuffer): void;
	draw(vertexCount: number, instanceCount?: number): void;
	end(): void;
}

export interface GPUColorAttachment {
	view: GPUTextureView;
	loadOp: GPULoadOp;
	storeOp: "store" | "discard";
	clearValue?: { r: number; g: number; b: number; a: number };
}

export interface GPUCommandEncoder {
	beginRenderPass(descriptor: { colorAttachments: GPUColorAttachment[] }): GPURenderPassEncoder;
	finish(): GPUCommandBuffer;
}

export interface GPUQueue {
	writeBuffer(
		buffer: GPUBuffer,
		bufferOffset: number,
		data: ArrayBufferView | ArrayBufferLike,
		dataOffset?: number,
		size?: number
	): void;
	submit(commandBuffers: GPUCommandBuffer[]): void;
}

export interface GPUDeviceLostInfo {
	readonly reason: string;
	readonly message: string;
}

export interface GPUUncapturedErrorEvent {
	readonly error: { readonly message: string };
}

/** Descriptor bags are typed loosely on purpose — they are write-only literals. */
export interface GPUDevice {
	readonly lost: Promise<GPUDeviceLostInfo>;
	readonly queue: GPUQueue;
	addEventListener(type: string, listener: (event: unknown) => void): void;
	createShaderModule(descriptor: { code: string }): GPUShaderModule;
	createBindGroupLayout(descriptor: { entries: unknown[] }): GPUBindGroupLayout;
	createPipelineLayout(descriptor: {
		bindGroupLayouts: GPUBindGroupLayout[];
	}): GPUPipelineLayout;
	createRenderPipeline(descriptor: {
		layout: GPUPipelineLayout;
		vertex: unknown;
		fragment: unknown;
		primitive: unknown;
	}): GPURenderPipeline;
	createSampler(descriptor: {
		magFilter?: string;
		minFilter?: string;
		addressModeU?: string;
		addressModeV?: string;
	}): GPUSampler;
	createBuffer(descriptor: { size: number; usage: number }): GPUBuffer;
	createBindGroup(descriptor: { layout: GPUBindGroupLayout; entries: unknown[] }): GPUBindGroup;
	createTexture(descriptor: {
		size: { width: number; height: number };
		format: GPUTextureFormat;
		usage: number;
	}): GPUTexture;
	createCommandEncoder(): GPUCommandEncoder;
	destroy(): void;
}

export interface GPUAdapter {
	requestDevice(): Promise<GPUDevice>;
}

export interface GPU {
	requestAdapter(): Promise<GPUAdapter | null>;
}

export interface GPUCanvasConfiguration {
	device: GPUDevice;
	format: GPUTextureFormat;
	alphaMode?: string;
	colorSpace?: string;
	toneMapping?: { mode?: string };
}

export interface GPUCanvasContext {
	configure(configuration: GPUCanvasConfiguration): void;
	unconfigure(): void;
	getConfiguration?(): GPUCanvasConfiguration | null;
	getCurrentTexture(): GPUTexture;
}

/**
 * The three WebGPU flag namespaces are runtime globals rather than types. They
 * are read off `globalThis` at the one call site that needs them, after the
 * adapter has already been obtained — so a browser without WebGPU never touches
 * them.
 */
export interface WebGpuGlobals {
	GPUShaderStage: { VERTEX: number; FRAGMENT: number };
	GPUBufferUsage: { UNIFORM: number; COPY_DST: number; VERTEX: number };
	GPUTextureUsage: { RENDER_ATTACHMENT: number; TEXTURE_BINDING: number };
}
