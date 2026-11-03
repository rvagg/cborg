# Security policy

## Supported versions

Fixes go to the latest release. cborg follows semver, so upgrading within a major version is safe.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting: the "Report a vulnerability" button on the [Security tab](https://github.com/rvagg/cborg/security). Please do not open a public issue.

Include the cborg version, the entry point and options used, and a minimal input that reproduces the problem.

I want to hear about anything that looks like a security problem, in any part of the package, including the CLI and the opt-in `cborg/extended` and `cborg/taglib` entry points.

## What counts as a vulnerability

cborg is built to decode bytes you don't trust, so the main concern is hostile input to `cborg` or `cborg/json`, and to `@ipld/dag-cbor` and `@ipld/dag-json`, which are built on them. See [Security considerations](../README.md#security-considerations) for what is already known and documented, such as sloppy defaults being opt-in strict, stack overflow on deep nesting, and output growth from shared references.

## Advisories

A report is not a promise of an advisory. I decide whether to publish one based on the severity, who is realistically exposed and whether publishing helps them. Open source developers are already inundated with noisy, low-value, low-impact reports and I don't intend to increase that with reports about issues that are unlikely to impact realistic use. Valid reports may be fixed in an ordinary release with no advisory. Regardless, I am grateful to reporters who spend the time to let me know about problems and will happily provide attribution where practical.
