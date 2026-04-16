# Changelog

All notable changes to the AeroFTP MCP Server extension will be documented in this file.

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
