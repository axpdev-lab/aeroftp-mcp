# Changelog

All notable changes to the AeroFTP MCP Server extension will be documented in this file.

## [1.0.2] - 2026-04-17

### Fixed

- **README Marketplace badge**: the retired `shields.io/visual-studio-marketplace` endpoint returned the literal text "retired badge" next to the label. Switched to `vsmarketplacebadges.dev` so the badge now shows the real published version.
- **AeroFTP version badge**: bumped from `v3.5.2` to `v3.5.4+` to reflect the minimum CLI version required for the `aeroftp mcp` subcommand to work.

### Required CLI

The extension registers `aeroftp-cli mcp` as the MCP server command. This subcommand was added in **AeroFTP v3.5.4**. Earlier versions will fail at startup with "unrecognized subcommand 'mcp'". Run `aeroftp --version` to confirm, and upgrade AeroFTP first if needed.

## [1.0.1] - 2026-04-16

### Changed

- License: MIT → GPL-3.0 (aligned with AeroFTP upstream).

## [1.0.0] - 2026-04-16

### Added

- **Multi-target MCP registration**: Install for Claude Code, Claude Desktop, Cursor, and Windsurf simultaneously via quick pick
- **Auto-detection**: Only shows targets that are installed on the system
- **Safe merge**: Preserves existing MCP servers in each target's config file
- **Status bar indicator**: Shows MCP server state (active, partial, inactive, no CLI, error)
- **Diagnostics command**: Per-target health check (CLI, MCP capability, config, permissions)
- **First-run prompt**: Detects `aeroftp-cli` and offers to configure all detected targets
- **Custom CLI path**: Setting for non-standard installations
- **Getting Started walkthrough**: 3 guided steps (install CLI, configure MCP, verify)
- **Platform-specific install guide**: Linux (Snap, AUR, deb, rpm, AppImage), macOS (.dmg), Windows (.msi)
- **Output channel**: Diagnostic logs and install instructions
- **Corrupt config recovery**: Option to view or overwrite malformed config files
- **Atomic writes**: Temp file + rename for safe config updates
- Cross-platform support (Linux, macOS, Windows)
