import { render, cleanup } from '@testing-library/svelte';
import { afterEach, describe, it, expect } from 'vitest';
import LetterPullup from './LetterPullup.svelte';

describe('LetterPullup', () => {
	afterEach(cleanup);

	it('renders one span per character', () => {
		const { container } = render(LetterPullup, { props: { words: 'Hello' } });
		const chars = container.querySelectorAll('.letter-pullup-char');
		expect(chars.length).toBe(5);
	});

	it('renders spaces as non-breaking spaces', () => {
		const { container } = render(LetterPullup, { props: { words: 'A B' } });
		const chars = container.querySelectorAll('.letter-pullup-char');
		expect(chars.length).toBe(3);
		expect(chars[1].innerHTML).toContain('&nbsp;');
	});

	it('applies staggered animation delays', () => {
		const { container } = render(LetterPullup, { props: { words: 'AB', delay: 0.1 } });
		const chars = container.querySelectorAll('.letter-pullup-char');
		const style0 = (chars[0] as HTMLElement).getAttribute('style') ?? '';
		const style1 = (chars[1] as HTMLElement).getAttribute('style') ?? '';
		expect(style0).toContain('animation-delay');
		expect(style0).toMatch(/animation-delay:\s*0s/);
		expect(style1).toContain('animation-delay');
		expect(style1).toMatch(/animation-delay:\s*0\.1s/);
	});

	it('applies custom class names', () => {
		const { container } = render(LetterPullup, {
			props: { words: 'Hi', class: 'my-pullup' }
		});
		const chars = container.querySelectorAll('.letter-pullup-char');
		chars.forEach((char) => {
			expect(char.className).toContain('my-pullup');
		});
	});

	it('has pull-up animation style', () => {
		const { container } = render(LetterPullup, { props: { words: 'X' } });
		const char = container.querySelector('.letter-pullup-char');
		const style = (char as HTMLElement).getAttribute('style') ?? '';
		expect(style).toContain('letterPullUp');
	});

	it('renders correct text content', () => {
		const { container } = render(LetterPullup, { props: { words: 'Test' } });
		const wrapper = container.querySelector('.letter-pullup');
		expect(wrapper?.textContent).toContain('Test');
	});
});
