## Configure MCP Server

The extension writes a single entry to `~/.claude/.mcp.json`:

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

Existing MCP servers in your configuration are preserved. Only the `aeroftp` entry is added or updated.

### Custom CLI path

If `aeroftp-cli` is not in your PATH, set the full path in VS Code settings:

```
AeroFTP MCP > CLI Path: /usr/local/bin/aeroftp-cli
```
