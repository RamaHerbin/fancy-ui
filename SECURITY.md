# Security Policy

## Supported Versions

fancy-ui is currently in 0.x (pre-1.0). Only the latest published `0.x` release
receives security fixes. Older 0.x releases are not patched — please upgrade
to the latest version before reporting an issue.

| Version      | Supported          |
| ------------ | ------------------ |
| Latest `0.x` | :white_check_mark: |
| Older `0.x`  | :x:                |

## Scope

This policy covers:

- The `fancy-ui-svelte` npm package (the component library source and its
  published build output).
- The docs site (fancy-ui.rama.app).

The docs site has no user accounts and stores no user data, so most classes
of account-takeover or data-exposure reports do not apply there. Reports
about the site's build pipeline, dependencies, or client-side code are still
welcome.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report privately through GitHub Security Advisories:

1. Go to the [RamaHerbin/fancy-ui](https://github.com/RamaHerbin/fancy-ui)
   repository.
2. Click **Security** → **Report a vulnerability**.
3. Include as much detail as you can: affected version, reproduction steps,
   and potential impact.

We aim to acknowledge new reports within **72 hours** and will work with you
to understand and address the issue before any public disclosure.
