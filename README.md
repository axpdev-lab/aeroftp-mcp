# AeroFTP MCP Server

[![VS Marketplace](https://vsmarketplacebadges.dev/version-short/axpdev-lab.aeroftp-mcp.svg?label=VS%20Marketplace&color=0078d7)](https://marketplace.visualstudio.com/items?itemName=axpdev-lab.aeroftp-mcp)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![AeroFTP](https://img.shields.io/badge/AeroFTP-v4.1.6%2B-0ea5e9)](https://github.com/axpdev-lab/aeroftp)

Configure the [AeroFTP](https://aeroftp.app) MCP server for **Claude Code**, **Claude Desktop**, **Cursor**, and **Windsurf** with one click. Gives your AI assistant access to **77 file management tools** across **22 protocols**, with real-time progress notifications during uploads, downloads, and tree-level sync.

Starting with AeroFTP **v4.0.0** the underlying transfer engine is a shared, provider-agnostic DAG scheduler that picks the right transfer shape per call from the provider's capabilities: native multipart upload fan-out on S3 / B2, server-side copy on every backend that supports it, and intra-file segmented downloads when the server proves it honours HTTP `Range`. The MCP tool surface is unchanged (same names, same arguments, same notifications); progress events are now sourced from the engine's per-node lifecycle. See the [architecture page](https://docs.aeroftp.app/architecture/dag-transfer-engine) for details.

## Features

- **Multi-target** - Install for Claude Code, Claude Desktop, Cursor, and Windsurf simultaneously
- **Auto-detection** - Only shows targets that are installed on your system
- **Safe merge** - Preserves existing MCP servers in your config
- **Status bar indicator** - Always know if the MCP server is active
- **Diagnostics** - Health check across all detected targets
- **Cross-platform** - Linux, macOS, Windows
- **Getting Started walkthrough** - Guided setup in 3 steps

## Prerequisites

[AeroFTP](https://github.com/axpdev-lab/aeroftp) must be installed with the CLI (`aeroftp-cli`) available in your PATH.

### Linux

| Method | Command |
|--------|---------|
| **Snap** | `sudo snap install aeroftp` |
| **AUR** | `yay -S aeroftp-bin` |
| **Deb** | `sudo dpkg -i aeroftp_*.deb` |
| **RPM** | `sudo rpm -i aeroftp-*.rpm` |
| **AppImage** | [Download from GitHub Releases](https://github.com/axpdev-lab/aeroftp/releases) |

### macOS / Windows

Download the latest installer from [GitHub Releases](https://github.com/axpdev-lab/aeroftp/releases).

## Usage

### Automatic

On first activation, the extension detects `aeroftp-cli` and offers to configure the MCP server automatically.

### Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `AeroFTP: Install MCP Server` | Register the MCP server (multi-target picker) |
| `AeroFTP: Remove MCP Server` | Remove the MCP server from selected targets |
| `AeroFTP: MCP Server Status` | Show per-target configuration details |
| `AeroFTP: Diagnose Installation` | Run health check across all targets |

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `aeroftp-mcp.cliPath` | `""` | Absolute path to `aeroftp-cli` (empty = auto-detect) |
| `aeroftp-mcp.showStatusBar` | `true` | Show status indicator in the status bar |

## Supported Targets

| Target | Config path |
|--------|------------|
| **Claude Code** | `~/.claude/.mcp.json` |
| **Claude Desktop** (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Claude Desktop** (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Cursor** | `~/.cursor/mcp.json` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` |

The extension auto-detects which targets are installed and only shows those in the picker. Each target receives the same entry:

```json
{
  "mcpServers": {
    "aeroftp": {
      "command": "aeroftp-cli",
      "args": ["mcp"]
    }
  }
}
```

Existing MCP servers in each config file are preserved. The MCP server communicates via JSON-RPC over stdio.

## Available MCP Tools

Once configured, your AI assistant gains access to 77 tools in total: 39 primary tools plus 38 `remote_*` and `server_*` aliases for cross-profile callers. The tables below document the primary operations by safety tier. The three `correct_*` error-correction tools operate on local files and have no alias.

That figure is generated from the binary rather than counted by hand: it is the `mcp_tools_total` recorded in [`docs/COMMAND-INVENTORY.json`](https://github.com/axpdev-lab/aeroftp/blob/main/docs/COMMAND-INVENTORY.json), which a CI gate checks for drift on every push. It had lagged the real surface for several app releases because nothing tied the two together.

### Safe (read-only)

| Tool | Description |
|------|-------------|
| `list_servers` | List saved server profiles, lean identity fields by default (filters: `name_contains`, `protocol`, `limit`, `offset`; pass `include_capabilities` to embed the transfer-capabilities block) |
| `mcp_info` | Server capabilities, version, supported protocols |
| `server_info` / `agent_connect` | Connect and return metadata in one call |
| `list_files` | List a directory (filters: glob, name_contains, recursive, limit) |
| `read_file` | Read text content (`preview_kb` window, soft-truncate inside the 1 MB hard cap) |
| `file_info` | File or directory metadata (size, mtime, permissions, hash) |
| `file_versions` | List historical versions where the protocol supports them |
| `search_files` | Recursive name search with extension/glob filters |
| `storage_quota` | Storage quota info; optional `scan`/`full`/`path` to compute a real used figure on no-quota backends (bounded recursive scan, mirrors CLI `df --scan`) |
| `head_file` / `tail_file` | First/last N lines of a remote text file |
| `tree` | Recursive directory tree (depth-capped) |
| `hashsum` | Server-side checksum (SHA-256 / SHA-1 / MD5 with provider fallback) |
| `check_tree` | Tree diff with two-sided checksum + per-group caps + `omit_match` |
| `sync_doctor` | Preflight risk summary with `suggested_next_command` |
| `reconcile` | Categorized size-only diff with `elapsed_secs` and `suggested_next_command` |
| `dedupe` (dry-run) | SHA-256 duplicate detection grouped per size |
| `transfer_stats` | Engine telemetry of the most recent DAG-engine transfer in this process: byte triple, retries, dispatch wait, concurrency high-water, time to first byte, CPU/RSS/FD delta. No arguments. Returns `available:false` when nothing has run. Note that this server's own `transfer` / `transfer_tree` take the direct cross-profile path and do NOT run the DAG engine, so they are never counted here; the figures come from GUI or CLI folder and sync transfers (AeroFTP v4.1.6+) |

### Medium (write)

| Tool | Description |
|------|-------------|
| `upload_file` / `upload_many` | Upload single or multiple files (`create_parents` recursive mkdir) |
| `download_file` | Download with progress stream |
| `transfer` / `transfer_tree` | Cross-profile copy (single file or recursive tree, dry-run + skip_existing) |
| `create_directory` | Create a remote directory (recursive `parents`) |
| `rename` | Rename/move a file or directory |
| `edit` | Find-and-replace on a remote UTF-8 text file without downloading it: all occurrences by default, or only the first with `first=true`. Bounded to a 10 MB streamed read, and written back temp-then-rename so a failed transfer never leaves the target half-written (AeroFTP v4.1.4+) |
| `touch` | Create empty file or report exists |
| `sync_tree` | Bidirectional sync with `plan[]` and per-file `delta_files[]` |
| `speed` | Throughput probe (random payload upload + download + SHA-256 integrity) |

### High (destructive)

| Tool | Description |
|------|-------------|
| `delete` | Delete a single remote file or directory (`dry_run` previews the exact files, dirs and bytes and deletes nothing; `recursive` is opt-in and refuses rather than silently erasing a subtree) |
| `delete_many` | Batch delete (`dry_run` preview; caps + configurable backoff) |
| `cleanup` | Sweep orphan `.aerotmp` files (dry-run by default) |
| `remote_versions` | Versioned S3-family only: list, download, restore (server-side copy-forward) and purge a single prior version of an object |
| `remote_trash` | Versioned S3-family only: browse bucket-wide soft-deleted objects and delete markers under a prefix, undelete (drop a delete marker), and empty the trash with a dry-run preview (never sweeps the live current version) |

### Error correction (local `.aerocorrect` sidecars)

| Tool | Description |
|------|-------------|
| `correct_gen` | Generate a detached `.aerocorrect` Reed-Solomon recovery sidecar for a local file (par2-style; overhead `level` 5-50, default 15) |
| `correct_verify` | Verify a local file against its `.aerocorrect` sidecar (read-only) |
| `correct_repair` | Repair a corrupted local file in place from its sidecar (atomic, all-or-nothing, fail-closed re-verify). Optional `expect_sha256` authenticity anchor refuses a sidecar declaring a different content hash before any write (requires AeroFTP CLI v4.0.7 or later) |

### Rate Limits

| Category | Limit |
|----------|-------|
| Read (list, stat, search) | 60/min |
| Write (upload, mkdir, rename) | 30/min |
| Delete | 10/min |

## Supported Protocols

FTP, FTPS, SFTP, WebDAV, S3 (+ Wasabi, Cloudflare R2, DigitalOcean Spaces, Backblaze B2, MinIO), Google Drive, Dropbox, OneDrive, MEGA, Box, pCloud, Azure Blob, 4shared, Filen, Zoho WorkDrive, Internxt, kDrive, Koofr, Jottacloud, FileLu, Yandex Disk, OpenDrive

## Links

- [AeroFTP](https://github.com/axpdev-lab/aeroftp) - Open-source file manager
- [LLM Integration Guide](https://github.com/axpdev-lab/aeroftp/blob/main/docs/LLM-INTEGRATION-GUIDE.md) - Full MCP/CLI integration docs
- [Threat Model](https://github.com/axpdev-lab/aeroftp/blob/main/docs/THREAT-MODEL.md) - Security documentation

## License

[GPL-3.0](LICENSE)
