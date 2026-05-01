# AeroFTP MCP Server

[![VS Marketplace](https://vsmarketplacebadges.dev/version-short/axpdev-lab.aeroftp-mcp.svg?label=VS%20Marketplace&color=0078d7)](https://marketplace.visualstudio.com/items?itemName=axpdev-lab.aeroftp-mcp)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![AeroFTP](https://img.shields.io/badge/AeroFTP-v3.7.0%2B-0ea5e9)](https://github.com/axpdev-lab/aeroftp)

Configure the [AeroFTP](https://aeroftp.app) MCP server for **Claude Code**, **Claude Desktop**, **Cursor**, and **Windsurf** with one click. Gives your AI assistant access to **39 file management tools** across **22 protocols**, with real-time progress notifications during uploads, downloads, and tree-level sync.

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

Once configured, your AI assistant gains access to 39 tools (each ships with a matching `remote_*` alias for cross-profile callers).

### Safe (read-only)

| Tool | Description |
|------|-------------|
| `list_servers` | List saved server profiles (filters: `name_contains`, `protocol`, `limit`, `offset`) |
| `mcp_info` | Server capabilities, version, supported protocols |
| `server_info` / `agent_connect` | Connect and return metadata in one call |
| `list_files` | List a directory (filters: glob, name_contains, recursive, limit) |
| `read_file` | Read text content (`preview_kb` window, soft-truncate inside the 1 MB hard cap) |
| `file_info` | File or directory metadata (size, mtime, permissions, hash) |
| `file_versions` | List historical versions where the protocol supports them |
| `search_files` | Recursive name search with extension/glob filters |
| `storage_quota` | Storage quota info |
| `head_file` / `tail_file` | First/last N lines of a remote text file |
| `tree` | Recursive directory tree (depth-capped) |
| `hashsum` | Server-side checksum (SHA-256 / SHA-1 / MD5 with provider fallback) |
| `check_tree` | Tree diff with two-sided checksum + per-group caps + `omit_match` |
| `sync_doctor` | Preflight risk summary with `suggested_next_command` |
| `reconcile` | Categorized size-only diff with `elapsed_secs` and `suggested_next_command` |
| `dedupe` (dry-run) | SHA-256 duplicate detection grouped per size |

### Medium (write)

| Tool | Description |
|------|-------------|
| `upload_file` / `upload_many` | Upload single or multiple files (`create_parents` recursive mkdir) |
| `download_file` | Download with progress stream |
| `transfer` / `transfer_tree` | Cross-profile copy (single file or recursive tree, dry-run + skip_existing) |
| `create_directory` | Create a remote directory (recursive `parents`) |
| `rename` | Rename/move a file or directory |
| `edit` | In-place text edit (find/replace) |
| `touch` | Create empty file or report exists |
| `sync_tree` | Bidirectional sync with `plan[]` and per-file `delta_files[]` |
| `speed` | Throughput probe (random payload upload + download + SHA-256 integrity) |

### High (destructive)

| Tool | Description |
|------|-------------|
| `delete` | Delete a single remote file or directory |
| `delete_many` | Batch delete (caps + configurable backoff) |
| `cleanup` | Sweep orphan `.aerotmp` files (dry-run by default) |

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
