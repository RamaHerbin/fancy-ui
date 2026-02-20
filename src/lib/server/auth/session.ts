import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'builder_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
	const secret = env.AUTH_SECRET;
	if (!secret) {
		throw new Error('AUTH_SECRET must be set');
	}
	return secret;
}

function sign(payload: string): string {
	const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
	return `${payload}.${sig}`;
}

function verify(cookie: string): string | null {
	const lastDot = cookie.lastIndexOf('.');
	if (lastDot === -1) return null;

	const payload = cookie.slice(0, lastDot);
	const sig = cookie.slice(lastDot + 1);

	const expected = createHmac('sha256', getSecret()).update(payload).digest('base64url');

	try {
		const sigBuf = Buffer.from(sig, 'base64url');
		const expectedBuf = Buffer.from(expected, 'base64url');
		if (sigBuf.length !== expectedBuf.length) return null;
		if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
	} catch {
		return null;
	}

	return payload;
}

export function createSessionCookie(cookies: Cookies, username: string): void {
	const value = sign(username);
	cookies.set(COOKIE_NAME, value, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: MAX_AGE
	});
}

export function verifySessionCookie(cookies: Cookies): { username: string } | null {
	const cookie = cookies.get(COOKIE_NAME);
	if (!cookie) return null;

	const username = verify(cookie);
	if (!username) return null;

	return { username };
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(COOKIE_NAME, { path: '/' });
}
