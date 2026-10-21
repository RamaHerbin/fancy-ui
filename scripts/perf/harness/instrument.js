// Injected with page.addInitScript before any page script runs. Counts what
// the CDP metrics cannot: animation frames, long tasks, WebGL contexts,
// listeners on long-lived targets, observers and intervals. Read through
// window.__probe.snapshot().
(() => {
	const probe = {
		raf: 0,
		longTasks: [],
		contexts: [],
		contextWarnings: 0,
		intervalsLive: 0,
		timeoutsScheduled: 0,
	};

	// Animation frames requested (callbacks queued), not frames painted.
	const nativeRaf = window.requestAnimationFrame.bind(window);
	window.requestAnimationFrame = (cb) => {
		probe.raf += 1;
		return nativeRaf(cb);
	};

	// Long tasks (> 50 ms on the main thread).
	try {
		new PerformanceObserver((list) => {
			for (const e of list.getEntries()) probe.longTasks.push(e.duration);
		}).observe({ type: "longtask", buffered: true });
	} catch {
		/* unsupported: longTasks stays empty */
	}

	// WebGL contexts: created, and weak refs to find the survivors.
	for (const proto of [HTMLCanvasElement.prototype]) {
		const native = proto.getContext;
		proto.getContext = function (type, ...rest) {
			const ctx = native.call(this, type, ...rest);
			if (ctx && /webgl/.test(String(type))) {
				probe.contexts.push({ canvas: new WeakRef(this), ctx: new WeakRef(ctx) });
			}
			return ctx;
		};
	}
	const nativeWarn = console.warn.bind(console);
	console.warn = (...args) => {
		if (/too many active webgl contexts/i.test(String(args[0]))) probe.contextWarnings += 1;
		nativeWarn(...args);
	};

	// Listeners: registered minus removed, per target, de-duplicated like the
	// platform does (same type + listener + capture is one registration).
	const ids = new WeakMap();
	let nextId = 1;
	const idOf = (l) => {
		if (!ids.has(l)) ids.set(l, nextId++);
		return ids.get(l);
	};
	const perTarget = new WeakMap();
	const isPersistent = (t) =>
		t === window ||
		t === document ||
		t === document.documentElement ||
		(document.body && t === document.body) ||
		(typeof MediaQueryList !== "undefined" && t instanceof MediaQueryList) ||
		(window.visualViewport && t === window.visualViewport);
	const counts = { persistentByType: {}, persistentTotal: 0, allTotal: 0 };
	const bump = (target, type, delta) => {
		counts.allTotal += delta;
		if (isPersistent(target)) {
			counts.persistentTotal += delta;
			counts.persistentByType[type] = (counts.persistentByType[type] ?? 0) + delta;
		}
	};
	const nativeAdd = EventTarget.prototype.addEventListener;
	const nativeRemove = EventTarget.prototype.removeEventListener;
	EventTarget.prototype.addEventListener = function (type, listener, options) {
		if (listener) {
			const capture = typeof options === "boolean" ? options : !!options?.capture;
			const once = typeof options === "object" && options?.once;
			const signal = typeof options === "object" ? options?.signal : undefined;
			const key = `${type}|${capture}|${idOf(listener)}`;
			let set = perTarget.get(this);
			if (!set) perTarget.set(this, (set = new Set()));
			if (!set.has(key) && !once && !(signal && signal.aborted)) {
				set.add(key);
				bump(this, type, 1);
				if (signal) {
					nativeAdd.call(signal, "abort", () => {
						if (set.delete(key)) bump(this, type, -1);
					});
				}
			}
		}
		return nativeAdd.call(this, type, listener, options);
	};
	EventTarget.prototype.removeEventListener = function (type, listener, options) {
		if (listener) {
			const capture = typeof options === "boolean" ? options : !!options?.capture;
			const set = perTarget.get(this);
			if (set?.delete(`${type}|${capture}|${idOf(listener)}`)) bump(this, type, -1);
		}
		return nativeRemove.call(this, type, listener, options);
	};

	// Observers: instances that still observe at least one target. Held weakly:
	// a strong reference would keep every observer callback, and the component
	// scope it closes over (renderer, GL context), alive after disconnect().
	const observers = new Set();
	for (const name of ["ResizeObserver", "IntersectionObserver", "MutationObserver"]) {
		const Native = window[name];
		if (!Native) continue;
		window[name] = class extends Native {
			constructor(...a) {
				super(...a);
				this.__targets = 0;
				observers.add(new WeakRef(this));
			}
			observe(...a) {
				this.__targets += 1;
				return super.observe(...a);
			}
			unobserve(...a) {
				this.__targets = Math.max(0, this.__targets - 1);
				return super.unobserve(...a);
			}
			disconnect() {
				this.__targets = 0;
				return super.disconnect();
			}
		};
	}

	// Intervals still running.
	const live = new Set();
	const nativeSetInterval = window.setInterval.bind(window);
	const nativeClearInterval = window.clearInterval.bind(window);
	window.setInterval = (...a) => {
		const id = nativeSetInterval(...a);
		live.add(id);
		return id;
	};
	window.clearInterval = (id) => {
		live.delete(id);
		return nativeClearInterval(id);
	};
	const nativeSetTimeout = window.setTimeout.bind(window);
	window.setTimeout = (...a) => {
		probe.timeoutsScheduled += 1;
		return nativeSetTimeout(...a);
	};

	const liveObserverCount = () => {
		let n = 0;
		for (const ref of observers) {
			const o = ref.deref();
			if (!o) observers.delete(ref);
			else if (o.__targets > 0) n += 1;
		}
		return n;
	};

	probe.snapshot = () => {
		const alive = probe.contexts.filter((c) => c.canvas.deref()?.isConnected);
		const retained = probe.contexts.filter((c) => c.ctx.deref());
		return {
			raf: probe.raf,
			longTasks: probe.longTasks.slice(),
			contextsCreated: probe.contexts.length,
			contextsConnected: alive.length,
			contextsRetained: retained.length,
			contextWarnings: probe.contextWarnings,
			persistentListeners: counts.persistentTotal,
			persistentListenersByType: { ...counts.persistentByType },
			trackedListeners: counts.allTotal,
			liveObservers: liveObserverCount(),
			intervalsLive: live.size,
			timeoutsScheduled: probe.timeoutsScheduled,
		};
	};
	window.__probe = probe;
})();
