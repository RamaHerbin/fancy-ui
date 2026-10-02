import { inject, provide, type InjectionKey } from "vue";

/**
 * A typed injection key plus its three bindings. `useRequired` throws a named
 * error outside its provider (the compound-component contract); `useOptional`
 * returns `undefined` (the degrade-gracefully contract — `getField()`,
 * `ToggleGroupItem` outside a `ToggleGroup`).
 *
 * House rule, inherited from `cameleon/context.ts`: a context value is the
 * Svelte getter object, built once in `setup` and never replaced. Do not
 * rebuild it in a `computed` and do not wrap it in `reactive()` — the getters
 * already read live sources, and a replacement object would make every
 * consumer's `computed` recompute for nothing.
 */
export interface InternalContext<T> {
	key: InjectionKey<T>;
	provide(value: T): void;
	useRequired(): T;
	useOptional(): T | undefined;
}

export function createInternalContext<T>(displayName: string): InternalContext<T> {
	const key: InjectionKey<T> = Symbol(displayName);

	function provideValue(value: T): void {
		provide(key, value);
	}

	function useRequired(): T {
		const value = inject(key, undefined);
		if (value === undefined) {
			throw new Error(`${displayName} is missing: this component must be rendered inside its provider.`);
		}
		return value;
	}

	function useOptional(): T | undefined {
		return inject(key, undefined);
	}

	return { key, provide: provideValue, useRequired, useOptional };
}
