# Changelog

All notable changes to the AeroFTP MCP Server extension will be documented in this file.

## [1.0.3] - 2026-04-19

### AeroFTP CLI requirement bumped to v3.5.5+

The AeroFTP MCP server now exposes **19 tools** (up from 16) plus progress notifications on long-running transfers. This extension is a thin registration wrapper and requires an AeroFTP CLI with the matching feature set.

### New MCP capabilities available via this extension

- **`aeroftp_sync_tree`**: synchronise a local directory with a remote directory. Direction (upload / download / both), dry-run, delete-orphans (unidirectional), conflict resolution (larger / newer / skip), glob excludes, max-depth.
- **`aeroftp_check_tree`**: tree diff against a remote root. Reports `match`, `differ`, `missing_local`, `missing_remote` groups with optional SHA-256 checksums and one-way mode.
- **`aeroftp_close_connection`**: explicitly evict a pooled connection by server name or id.
- **Real-time progress notifications** (`notifications/progress`): emitted on uploads, downloads, and sync_tree runs when the client attaches a `progressToken`. Rate-limited to roughly 10 Hz with a guaranteed final flush.
- **`aeroftp://connections` resource expanded**: now returns full per-connection metadata (protocol, state, idle_secs, connected_at, requests_served) plus `max_pool_size` and `idle_timeout_secs` on the envelope. Useful for agents planning cache-friendly call orderings.

### Performance note

AeroFTP MCP reuses a pooled connection across tool calls. Measured speedup against the CLI cold-start path is approximately **14x on warm calls** (13-14 ms via MCP vs ~194 ms via CLI) on a local SFTP target. This is why MCP is now the recommended transport for agent workflows that issue multiple consecutive operations against the same server.

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
