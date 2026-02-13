import { render, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import LiquidGlass from './LiquidGlass.svelte';

describe('LiquidGlass', () => {
	beforeEach(() => {
		// Mock ResizeObserver (not available in jsdom)
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(cleanup);

	it('renders the component', () => {
		const { container } = render(LiquidGlass);
		const wrapper = container.querySelector('.liquid-glass-effect');
		expect(wrapper).toBeInTheDocument();
	});

	it('renders slot container', () => {
		const { container } = render(LiquidGlass);
		const slot = container.querySelector('.liquid-glass-slot');
		expect(slot).toBeInTheDocument();
	});

	it('applies custom container class', () => {
		const { container } = render(LiquidGlass, { props: { containerClass: 'my-container' } });
		const wrapper = container.querySelector('.liquid-glass-effect');
		expect(wrapper?.className).toContain('my-container');
	});

	it('applies custom class to slot container', () => {
		const { container } = render(LiquidGlass, { props: { class: 'my-slot' } });
		const slot = container.querySelector('.liquid-glass-slot');
		expect(slot?.className).toContain('my-slot');
	});

	it('sets frost CSS variable', () => {
		const { container } = render(LiquidGlass, { props: { frost: 0.1 } });
		const wrapper = container.querySelector('.liquid-glass-effect') as HTMLElement;
		expect(wrapper.getAttribute('style')).toContain('--frost');
		expect(wrapper.getAttribute('style')).toContain('0.1');
	});

	it('sets border radius', () => {
		const { container } = render(LiquidGlass, { props: { radius: 24 } });
		const wrapper = container.querySelector('.liquid-glass-effect') as HTMLElement;
		expect(wrapper.getAttribute('style')).toContain('border-radius');
		expect(wrapper.getAttribute('style')).toContain('24px');
	});
});
