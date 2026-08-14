# Security Policy

## Supported version

Security fixes currently target the latest published Monitor Manager release.

## Reporting a vulnerability

Please use GitHub private vulnerability reporting when it is available for this repository. Do not open a public issue for a vulnerability that could expose user data, execute unintended commands, or alter display configuration without confirmation.

Include the affected version, operating system, reproduction steps, and expected impact. Remove access tokens, personal paths, monitor identifiers, and other private information from reports.

## Local data and native access

Monitor Manager stores profiles and last-known display state locally under Electron's per-user application-data directory. It does not send telemetry or require an account.

The Windows adapter invokes the bundled PowerShell helper in the signed-in interactive session. External links are restricted to HTTP and HTTPS. Release binaries are not currently code-signed, so users should verify checksums published with each release.
