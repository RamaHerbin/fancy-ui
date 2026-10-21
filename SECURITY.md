# Security Policy

## Supported Versions

FancyUI ships three npm packages: `fancy-ui-svelte`, `fancy-ui-react` and
`fancy-ui-vue`. All are pre-1.0. Only the latest published release of each
package receives security fixes; older releases are not patched, so please
upgrade before reporting an issue.

| Package           | Supported                |
| ----------------- | ------------------------ |
| `fancy-ui-svelte` | Latest release only      |
| `fancy-ui-react`  | Latest release only      |
| `fancy-ui-vue`    | Latest release only      |
| Older releases    | :x:                      |

## Scope

This policy covers:

- The three npm packages above (the component source and the published build
  output).
- The copy-into-your-project registries served by the docs site.
- The docs site (fancy-ui.rama.app).

The docs site has no user accounts and stores no user data, with one
exception: the site builder (`/builder`). When sign-in is configured, the
builder signs you in through an OAuth provider and keeps two httpOnly cookies:
a signed session cookie that holds your username, and a cookie that holds the
provider access token. The token cookie is signed, not encrypted. Nothing else
about you is stored. Reports about that sign-in flow, the cookies, the site's
build pipeline, its dependencies or its client-side code are welcome.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report privately through GitHub Security Advisories:

1. Go to the [RamaHerbin/fancy-ui](https://github.com/RamaHerbin/fancy-ui)
   repository.
2. Click **Security** → **Report a vulnerability**.
3. Include as much detail as you can: the package and version, reproduction
   steps, and potential impact.

We aim to acknowledge new reports within **72 hours** and will work with you
to understand and address the issue before any public disclosure.
