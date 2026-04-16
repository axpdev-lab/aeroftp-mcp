# Changelog

All notable changes to the AeroFTP MCP Server extension will be documented in this file.

## [1.0.0] - 2026-04-16

### Added

- **MCP server registration** in `~/.claude/.mcp.json` with safe merge (preserves existing servers)
- **Automatic CLI detection** via PATH lookup with platform-specific search (`which`/`where`)
- **Custom CLI path** setting for non-standard installations
- **Status bar indicator** showing MCP server state (active, inactive, no CLI, error)
- **Diagnostics command** with 4-step health check (CLI, MCP capability, config file, permissions)
- **First-run prompt** when `aeroftp-cli` is detected but MCP not yet configured
- **Getting Started walkthrough** with 3 guided steps (install CLI, configure MCP, verify)
- **Platform-specific install guide** for Linux (Snap, AUR, deb, rpm, AppImage), macOS (.dmg), Windows (.msi)
- **Output channel** for diagnostic logs and install instructions
- **Corrupt config recovery** with option to view or overwrite malformed `.mcp.json`
- Cross-platform support (Linux, macOS, Windows)
