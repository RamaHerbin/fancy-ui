import { GitHub } from "arctic";
import { env } from "$env/dynamic/private";

let _github: GitHub | undefined;

export function getGitHub(): GitHub {
	if (!_github) {
		const clientId = env.GITHUB_CLIENT_ID;
		const clientSecret = env.GITHUB_CLIENT_SECRET;
		if (!clientId || !clientSecret) {
			throw new Error("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set");
		}
		_github = new GitHub(clientId, clientSecret, null);
	}
	return _github;
}

export function getAllowedUsers(): string[] {
	const raw = env.GITHUB_ALLOWED_USERS ?? "";
	return raw
		.split(",")
		.map((u) => u.trim().toLowerCase())
		.filter(Boolean);
}
