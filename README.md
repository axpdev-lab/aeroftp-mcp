# AeroFTP MCP Server

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/axpdev-lab.aeroftp-mcp?label=VS%20Code%20Marketplace&color=0078d7)](https://marketplace.visualstudio.com/items?itemName=axpdev-lab.aeroftp-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![AeroFTP](https://img.shields.io/badge/AeroFTP-v3.5.2-0ea5e9)](https://github.com/axpdev-lab/aeroftp)

Configure the [AeroFTP](https://aeroftp.app) MCP server for **Claude Code**, **Claude Desktop**, **Cursor**, and **Windsurf** with one click. Gives your AI assistant access to **16 file management tools** across **28 protocols**.

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

Once configured, your AI assistant gains access to 16 tools:

### Safe (read-only)

| Tool | Description |
|------|-------------|
| `list_directory` | List files in a directory |
| `read_file` | Read file content |
| `stat` | Get file/directory metadata |
| `search` | Search for files by name pattern |
| `get_quota` | Get storage quota info |
| `list_profiles` | List saved server profiles |
| `connect` | Connect to a saved profile |
| `disconnect` | Disconnect from current server |
| `server_info` | Get server/protocol information |

### Medium (write operations)

| Tool | Description |
|------|-------------|
| `download_file` | Download file to local path |
| `upload_file` | Upload local file to remote |
| `create_directory` | Create a remote directory |
| `rename` | Rename/move a file or directory |
| `copy` | Server-side copy (if supported) |

### High (destructive)

| Tool | Description |
|------|-------------|
| `delete_file` | Delete a remote file |
| `delete_directory` | Delete a remote directory |

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

[MIT](LICENSE)
