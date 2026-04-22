# Changelog

All notable changes to the AeroFTP MCP Server extension will be documented in this file.

## [1.0.5] - 2026-04-22

### AeroFTP CLI requirement bumped to v3.6.0+

This extension is a thin registration wrapper — no code changes; the new capabilities below arrive automatically once the CLI is updated. Bump `aeroftp-cli` to v3.6.0 or later.

### New MCP capabilities available via this extension

- **`aeroftp_sync_tree` per-file delta breakdown**: the response (dry-run and apply) now carries `summary.delta_files[]`, an array of `{path, bytes_sent, total_size, speedup}` entries for every file serviced by the optimized rsync-over-SSH transfer path. The array is capped at 500 entries; when a run crosses the cap, `summary.delta_files_truncated: true` flags the truncation. The aggregate counters in `summary.delta_savings` keep counting past the cap, so top-line savings stay accurate even on very large trees. Both keys are omitted on runs where no file used the optimized path, preserving the absence-vs-null contract with the existing `delta_savings` block.
- **`aeroftp_read_file` soft-truncate inside the hard cap**: files that exceed the requested `preview_kb` window but sit below the 1 MB hard cap now return a truncated content payload with `truncated: true` instead of surfacing a hard error. The validator still rejects requests beyond the 1 MB hard cap. This eliminates the forced retry loop agents used to hit when they encountered a file slightly over the preview window they asked for.
- **`aeroftp_check_tree` exposes `compare_method` on the match group too**: previously only the `differ`, `missing_local`, and `missing_remote` groups carried the `compare_method: "checksum" | "size"` flag. The `groups.match` array now carries the same flag on every entry, so agents can tell whether a match was cryptographically verified via server-side checksum or fell back to size-only matching (typical on FTP where no checksum primitive exists).

## [1.0.4] - 2026-04-21

### AeroFTP CLI requirement bumped to v3.5.8+

The AeroFTP MCP server now exposes **20 tools** (up from 19) with significantly improved agent ergonomics. This extension is a thin registration wrapper — no code changes; the new capabilities arrive automatically as soon as the CLI is updated. Bump `aeroftp-cli` to v3.5.8 or later (v3.5.9 recommended for CLI-side parity).

### New MCP capabilities available via this extension

- **`aeroftp_delete_many`**: batch delete of up to 100 remote paths with configurable inter-delete backoff (`delay_ms`, default 200 ms, cap 2 000 ms). `recursive` and `continue_on_error` round out the surface; response carries per-item result + aggregate summary.
- **`aeroftp_list_servers` filtering**: optional `name_contains`, `protocol`, `limit` (default 200, cap 1 000), and `offset` arguments so agents can work against vaults with many profiles without paying a full-list parse on every invocation.
- **`aeroftp_read_file` preview window**: new `preview_kb` argument (default 5, hard cap 1 024). The too-large error message now tells the caller the window used and the cap so they can raise it or switch to `aeroftp_download_file`.
- **`aeroftp_upload_file` auto-mkdir**: new `create_parents` boolean. When true, the tool recursively mkdirs every missing parent of the destination idempotently.
- **`aeroftp_sync_tree` dry-run plan**: the dry-run response now includes a `plan[]` array (`{op, path, reason, bytes}`) plus a `planned.{uploaded, downloaded, deleted, skipped}` counter block, eliminating the need to shell out to `aeroftp-cli sync --dry-run -v` for agent-driven planning.
- **`aeroftp_check_tree` two-sided checksum**: with `checksum=true`, the tool now requests the remote checksum via `provider.checksum()` when supported, picks SHA-256 → SHA-1 → MD5, and compares algo-for-algo. Cross-algorithm mismatches safely fall back to size-only. New `compare_method: "checksum" | "size"` field on each diff entry plus a top-level `checksum_remote_supported` flag.

### Reliability

- **Connection pool auto-reset on transport failure**: pool entries are now invalidated (fire-and-forget disconnect) when a tool call fails with a transport-level error (`NotConnected`, `Timeout`, `NetworkError`, message patterns like *"Data connection is already open"*, *"broken pipe"*, *"connection reset"*). Short operations transparently retry once on a fresh connection. `aeroftp_close_connection` is no longer required after a failed FTP upload.

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
