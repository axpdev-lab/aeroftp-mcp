## Install AeroFTP CLI

AeroFTP is an open-source multi-protocol file manager. The CLI provides the MCP server that Claude Code connects to.

### Linux

| Method | Command |
|--------|---------|
| **Snap** | `sudo snap install aeroftp` |
| **AUR** | `yay -S aeroftp-bin` |
| **deb/rpm/AppImage** | [GitHub Releases](https://github.com/axpdev-lab/aeroftp/releases) |

### macOS / Windows

Download the latest release from [GitHub Releases](https://github.com/axpdev-lab/aeroftp/releases).

### Verify

After installation, verify the CLI is available:

```bash
aeroftp-cli --version
```
