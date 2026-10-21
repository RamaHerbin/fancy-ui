// The toast stack is a module-level singleton, so a toast raised by one test
// would still be on screen in the next. A test file wraps the package with
// `withTracking` (through vi.mock) and calls `clearToasts()` after each test.
//
//   vi.mock("fancy-ui-svelte", async (original) =>
//     (await import("$lib/test/toast-tracker.js")).withTracking(await original())
//   );
type ToastFn = (options: never) => string;
type PackageShape = { toast: ToastFn; dismissToast: (id: string) => void };

const ids: string[] = [];
let dismiss: ((id: string) => void) | undefined;

export function withTracking<T extends PackageShape>(pkg: T): T {
	dismiss = pkg.dismissToast;
	return {
		...pkg,
		toast: ((options: never) => {
			const id = pkg.toast(options);
			ids.push(id);
			return id;
		}) as ToastFn,
	};
}

export function clearToasts() {
	for (const id of ids.splice(0)) dismiss?.(id);
}
