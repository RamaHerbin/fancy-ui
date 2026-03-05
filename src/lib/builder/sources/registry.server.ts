import type { ContentSource, ContentTransformer } from "./types.js";

export interface SourceRegistration {
	source: ContentSource;
	transformer: ContentTransformer;
	enabled: boolean;
}

class SourceRegistry {
	private sources = new Map<string, SourceRegistration>();

	register(key: string, reg: SourceRegistration): void {
		this.sources.set(key, reg);
	}

	get(key: string): SourceRegistration | undefined {
		return this.sources.get(key);
	}

	listEnabled(): Array<{ key: string; registration: SourceRegistration }> {
		return [...this.sources.entries()]
			.filter(([, reg]) => reg.enabled)
			.map(([key, registration]) => ({ key, registration }));
	}
}

let _instance: SourceRegistry | undefined;

export function getSourceRegistry(): SourceRegistry {
	if (!_instance) {
		_instance = new SourceRegistry();
	}
	return _instance;
}
