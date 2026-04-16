import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ── Constants ──────────────────────────────────────────────────────────

const MCP_SERVER_NAME = 'aeroftp';
const MCP_COMMAND = 'aeroftp-cli';
const MCP_ARGS = ['mcp'];
const EXTENSION_ID = 'aeroftp-mcp';
const INSTALL_URL = 'https://github.com/axpdev-lab/aeroftp/releases';
const DOCS_URL = 'https://github.com/axpdev-lab/aeroftp/blob/main/docs/LLM-INTEGRATION-GUIDE.md';

// ── Types ──────────────────────────────────────────────────────────────

interface McpServerConfig {
    command: string;
    args?: string[];
}

interface McpConfig {
    mcpServers?: Record<string, McpServerConfig>;
    [key: string]: unknown;
}

interface CliInfo {
    path: string;
    version: string | null;
}

// ── Output Channel ─────────────────────────────────────────────────────

let outputChannel: vscode.OutputChannel;

function log(message: string): void {
    const timestamp = new Date().toISOString().slice(11, 19);
    outputChannel.appendLine(`[${timestamp}] ${message}`);
}

// ── Status Bar ─────────────────────────────────────────────────────────

let statusBarItem: vscode.StatusBarItem;

function updateStatusBar(state: 'active' | 'inactive' | 'error' | 'no-cli'): void {
    const showStatusBar = vscode.workspace
        .getConfiguration(EXTENSION_ID)
        .get<boolean>('showStatusBar', true);

    if (!showStatusBar) {
        statusBarItem.hide();
        return;
    }

    switch (state) {
        case 'active':
            statusBarItem.text = '$(check) AeroFTP MCP';
            statusBarItem.tooltip = 'AeroFTP MCP server is configured for Claude Code';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'inactive':
            statusBarItem.text = '$(plug) AeroFTP MCP';
            statusBarItem.tooltip = 'Click to install AeroFTP MCP server';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'error':
            statusBarItem.text = '$(warning) AeroFTP MCP';
            statusBarItem.tooltip = 'AeroFTP MCP configuration error - click for details';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            break;
        case 'no-cli':
            statusBarItem.text = '$(cloud-download) AeroFTP MCP';
            statusBarItem.tooltip = 'aeroftp-cli not found - click for installation guide';
            statusBarItem.backgroundColor = undefined;
            break;
    }
    statusBarItem.command = `${EXTENSION_ID}.status`;
    statusBarItem.show();
}

// ── MCP Config ─────────────────────────────────────────────────────────

function getMcpConfigPath(): string {
    return path.join(os.homedir(), '.claude', '.mcp.json');
}

function readMcpConfig(): { config: McpConfig; error: string | null } {
    const configPath = getMcpConfigPath();

    if (!fs.existsSync(configPath)) {
        return { config: {}, error: null };
    }

    try {
        const raw = fs.readFileSync(configPath, 'utf-8').trim();
        if (raw === '') {
            return { config: {}, error: null };
        }
        const config = JSON.parse(raw) as McpConfig;
        if (typeof config !== 'object' || config === null || Array.isArray(config)) {
            return { config: {}, error: 'Config file is not a JSON object' };
        }
        return { config, error: null };
    } catch (err) {
        const message = err instanceof SyntaxError
            ? `Invalid JSON in ${configPath}: ${err.message}`
            : `Cannot read ${configPath}: ${err instanceof Error ? err.message : String(err)}`;
        return { config: {}, error: message };
    }
}

function writeMcpConfig(config: McpConfig): string | null {
    const configPath = getMcpConfigPath();
    const dir = path.dirname(configPath);

    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const tmpPath = configPath + '.tmp';
        fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
        fs.renameSync(tmpPath, configPath);
        return null;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('EACCES') || message.includes('permission')) {
            return `Permission denied writing ${configPath}. Check file permissions.`;
        }
        return `Failed to write ${configPath}: ${message}`;
    }
}

function isServerInstalled(config: McpConfig): boolean {
    return config.mcpServers !== undefined && MCP_SERVER_NAME in config.mcpServers;
}

// ── CLI Detection ──────────────────────────────────────────────────────

function getConfiguredCliPath(): string {
    return vscode.workspace
        .getConfiguration(EXTENSION_ID)
        .get<string>('cliPath', '')
        .trim();
}

async function findCli(): Promise<CliInfo | null> {
    const configured = getConfiguredCliPath();
    if (configured) {
        if (fs.existsSync(configured)) {
            const version = await getCliVersion(configured);
            return { path: configured, version };
        }
        log(`Configured CLI path not found: ${configured}`);
        return null;
    }

    const which = process.platform === 'win32' ? 'where' : 'which';
    try {
        const { stdout } = await execFileAsync(which, [MCP_COMMAND], { timeout: 5000 });
        const cliPath = stdout.trim().split('\n')[0].trim();
        if (!cliPath) {
            return null;
        }
        const version = await getCliVersion(cliPath);
        return { path: cliPath, version };
    } catch {
        return null;
    }
}

async function getCliVersion(cliPath: string): Promise<string | null> {
    try {
        const { stdout } = await execFileAsync(cliPath, ['--version'], { timeout: 5000 });
        return stdout.trim().replace(/^aeroftp-cli\s*/i, '');
    } catch {
        return null;
    }
}

// ── Platform-Specific Install Guide ────────────────────────────────────

function getInstallInstructions(): string {
    const platform = process.platform;

    const common = [
        '',
        'Or download from GitHub Releases:',
        INSTALL_URL,
    ];

    if (platform === 'linux') {
        return [
            'Install AeroFTP CLI:',
            '',
            '  Snap:       sudo snap install aeroftp',
            '  AUR:        yay -S aeroftp-bin',
            '  Deb:        sudo dpkg -i aeroftp_*.deb',
            '  RPM:        sudo rpm -i aeroftp-*.rpm',
            '  AppImage:   chmod +x AeroFTP-*.AppImage && ./AeroFTP-*.AppImage',
            ...common,
        ].join('\n');
    }

    if (platform === 'darwin') {
        return [
            'Install AeroFTP CLI:',
            '',
            '  Download the .dmg from GitHub Releases:',
            '  ' + INSTALL_URL,
            '',
            '  After installing, ensure aeroftp-cli is in your PATH.',
            '  You may need to add it manually:',
            '    export PATH="/Applications/AeroFTP.app/Contents/MacOS:$PATH"',
        ].join('\n');
    }

    if (platform === 'win32') {
        return [
            'Install AeroFTP CLI:',
            '',
            '  Download the .msi or .exe installer from GitHub Releases:',
            '  ' + INSTALL_URL,
            '',
            '  The installer adds aeroftp-cli to your PATH automatically.',
            '  If not found after install, restart VS Code or your terminal.',
        ].join('\n');
    }

    return [
        'Install AeroFTP CLI from GitHub Releases:',
        INSTALL_URL,
    ].join('\n');
}

// ── Commands ───────────────────────────────────────────────────────────

async function installMcpServer(): Promise<void> {
    log('Install command triggered');

    const cli = await findCli();
    if (!cli) {
        log('CLI not found');
        const action = await vscode.window.showErrorMessage(
            'aeroftp-cli not found on this system. Install AeroFTP first, then retry.',
            'Download AeroFTP',
            'Set CLI Path',
            'Show Install Guide',
        );
        if (action === 'Download AeroFTP') {
            vscode.env.openExternal(vscode.Uri.parse(INSTALL_URL));
        } else if (action === 'Set CLI Path') {
            vscode.commands.executeCommand(
                'workbench.action.openSettings',
                `${EXTENSION_ID}.cliPath`,
            );
        } else if (action === 'Show Install Guide') {
            outputChannel.clear();
            outputChannel.appendLine(getInstallInstructions());
            outputChannel.show();
        }
        updateStatusBar('no-cli');
        return;
    }

    log(`CLI found: ${cli.path} (${cli.version ?? 'unknown version'})`);

    const { config, error } = readMcpConfig();
    if (error) {
        log(`Config error: ${error}`);
        const action = await vscode.window.showErrorMessage(
            `Cannot read MCP config: ${error}`,
            'Open Config File',
            'Overwrite Config',
        );
        if (action === 'Open Config File') {
            const doc = await vscode.workspace.openTextDocument(getMcpConfigPath());
            vscode.window.showTextDocument(doc);
            return;
        }
        if (action !== 'Overwrite Config') {
            return;
        }
    }

    if (isServerInstalled(config)) {
        const existing = config.mcpServers![MCP_SERVER_NAME];
        const currentCmd = `${existing.command} ${(existing.args ?? []).join(' ')}`;
        const newCmd = `${MCP_COMMAND} ${MCP_ARGS.join(' ')}`;
        if (currentCmd === newCmd) {
            vscode.window.showInformationMessage(
                'AeroFTP MCP server is already configured. No changes needed.',
            );
            updateStatusBar('active');
            return;
        }
        const overwrite = await vscode.window.showWarningMessage(
            `AeroFTP MCP server is already configured with a different command: "${currentCmd}". Update to "${newCmd}"?`,
            'Update',
            'Cancel',
        );
        if (overwrite !== 'Update') {
            return;
        }
    }

    if (!config.mcpServers) {
        config.mcpServers = {};
    }

    const cliCommand = getConfiguredCliPath() || MCP_COMMAND;
    config.mcpServers[MCP_SERVER_NAME] = {
        command: cliCommand,
        args: MCP_ARGS,
    };

    const writeError = writeMcpConfig(config);
    if (writeError) {
        log(`Write error: ${writeError}`);
        vscode.window.showErrorMessage(writeError);
        updateStatusBar('error');
        return;
    }

    const versionStr = cli.version ? ` v${cli.version}` : '';
    log(`MCP server installed successfully${versionStr}`);
    vscode.window.showInformationMessage(
        `AeroFTP MCP server configured${versionStr}. Claude Code can now access 16 file management tools across 28 protocols.`,
        'View Documentation',
    ).then(action => {
        if (action === 'View Documentation') {
            vscode.env.openExternal(vscode.Uri.parse(DOCS_URL));
        }
    });

    updateStatusBar('active');
}

async function removeMcpServer(): Promise<void> {
    log('Remove command triggered');

    const { config, error } = readMcpConfig();
    if (error) {
        vscode.window.showErrorMessage(`Cannot read MCP config: ${error}`);
        return;
    }

    if (!isServerInstalled(config)) {
        vscode.window.showInformationMessage('AeroFTP MCP server is not configured. Nothing to remove.');
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        'Remove AeroFTP MCP server from Claude Code configuration?',
        { modal: true, detail: 'Claude Code will no longer have access to AeroFTP file management tools.' },
        'Remove',
    );
    if (confirm !== 'Remove') {
        return;
    }

    delete config.mcpServers![MCP_SERVER_NAME];
    if (Object.keys(config.mcpServers!).length === 0) {
        delete config.mcpServers;
    }

    const writeError = writeMcpConfig(config);
    if (writeError) {
        vscode.window.showErrorMessage(writeError);
        updateStatusBar('error');
        return;
    }

    log('MCP server removed');
    vscode.window.showInformationMessage('AeroFTP MCP server removed from Claude Code configuration.');
    updateStatusBar('inactive');
}

async function showStatus(): Promise<void> {
    log('Status command triggered');

    const cli = await findCli();
    const { config, error } = readMcpConfig();
    const installed = !error && isServerInstalled(config);
    const configPath = getMcpConfigPath();
    const configExists = fs.existsSync(configPath);

    outputChannel.clear();
    outputChannel.appendLine('=== AeroFTP MCP Server Status ===');
    outputChannel.appendLine('');

    // CLI status
    if (cli) {
        outputChannel.appendLine(`CLI binary:    ${cli.path}`);
        outputChannel.appendLine(`CLI version:   ${cli.version ?? 'unknown'}`);
    } else {
        const configured = getConfiguredCliPath();
        if (configured) {
            outputChannel.appendLine(`CLI binary:    NOT FOUND (configured path: ${configured})`);
        } else {
            outputChannel.appendLine(`CLI binary:    NOT FOUND in PATH`);
        }
    }
    outputChannel.appendLine('');

    // Config status
    outputChannel.appendLine(`Config file:   ${configPath}`);
    outputChannel.appendLine(`Config exists: ${configExists ? 'yes' : 'no'}`);
    if (error) {
        outputChannel.appendLine(`Config error:  ${error}`);
    }
    outputChannel.appendLine('');

    // MCP status
    outputChannel.appendLine(`MCP server:    ${installed ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    if (installed) {
        const serverConfig = config.mcpServers![MCP_SERVER_NAME];
        outputChannel.appendLine(`  command:     ${serverConfig.command}`);
        outputChannel.appendLine(`  args:        ${(serverConfig.args ?? []).join(' ')}`);
    }
    outputChannel.appendLine('');

    // Other MCP servers
    if (config.mcpServers) {
        const others = Object.keys(config.mcpServers).filter(k => k !== MCP_SERVER_NAME);
        if (others.length > 0) {
            outputChannel.appendLine(`Other MCP servers: ${others.join(', ')}`);
            outputChannel.appendLine('');
        }
    }

    // Platform
    outputChannel.appendLine(`Platform:      ${process.platform} (${process.arch})`);
    outputChannel.appendLine(`VS Code:       ${vscode.version}`);
    outputChannel.appendLine('');

    outputChannel.show();

    // Action buttons
    if (!cli) {
        const action = await vscode.window.showWarningMessage(
            'aeroftp-cli not found. Install AeroFTP to use the MCP server.',
            'Download AeroFTP',
            'Set CLI Path',
        );
        if (action === 'Download AeroFTP') {
            vscode.env.openExternal(vscode.Uri.parse(INSTALL_URL));
        } else if (action === 'Set CLI Path') {
            vscode.commands.executeCommand('workbench.action.openSettings', `${EXTENSION_ID}.cliPath`);
        }
    } else if (!installed) {
        const action = await vscode.window.showInformationMessage(
            'AeroFTP CLI detected but MCP server not configured.',
            'Install Now',
        );
        if (action === 'Install Now') {
            await installMcpServer();
        }
    }
}

async function diagnose(): Promise<void> {
    log('Diagnose command triggered');

    outputChannel.clear();
    outputChannel.appendLine('=== AeroFTP MCP Diagnostics ===');
    outputChannel.appendLine('');

    // Step 1: CLI detection
    outputChannel.appendLine('1. Checking aeroftp-cli...');
    const cli = await findCli();
    if (cli) {
        outputChannel.appendLine(`   PASS: Found at ${cli.path}`);
        outputChannel.appendLine(`   Version: ${cli.version ?? 'unknown'}`);
    } else {
        const configured = getConfiguredCliPath();
        if (configured) {
            outputChannel.appendLine(`   FAIL: Configured path "${configured}" does not exist`);
        } else {
            outputChannel.appendLine('   FAIL: aeroftp-cli not found in PATH');
        }
        outputChannel.appendLine('');
        outputChannel.appendLine(getInstallInstructions());
        outputChannel.show();
        updateStatusBar('no-cli');
        return;
    }
    outputChannel.appendLine('');

    // Step 2: MCP capability check
    outputChannel.appendLine('2. Checking MCP capability...');
    try {
        const { stdout } = await execFileAsync(cli.path, ['agent-info', '--json'], { timeout: 10000 });
        const info = JSON.parse(stdout);
        const toolCount = info.mcp_tools?.length ?? info.tools?.length ?? '?';
        const protocols = info.supported_protocols?.length ?? info.protocols?.length ?? '?';
        outputChannel.appendLine(`   PASS: ${toolCount} MCP tools, ${protocols} protocols`);
    } catch {
        outputChannel.appendLine('   WARN: Could not query agent-info (non-critical)');
    }
    outputChannel.appendLine('');

    // Step 3: Config file
    outputChannel.appendLine('3. Checking Claude Code config...');
    const configPath = getMcpConfigPath();
    const configDir = path.dirname(configPath);

    if (!fs.existsSync(configDir)) {
        outputChannel.appendLine(`   INFO: Directory ${configDir} does not exist (will be created on install)`);
    } else {
        outputChannel.appendLine(`   PASS: Config directory exists`);
    }

    const { config, error } = readMcpConfig();
    if (error) {
        outputChannel.appendLine(`   FAIL: ${error}`);
        outputChannel.appendLine('');
        outputChannel.appendLine('   Fix: Open the file and correct the JSON syntax, or delete it to start fresh.');
    } else if (isServerInstalled(config)) {
        outputChannel.appendLine(`   PASS: AeroFTP MCP server is configured`);
    } else {
        outputChannel.appendLine('   INFO: AeroFTP MCP server not yet configured');
    }
    outputChannel.appendLine('');

    // Step 4: Write permissions
    outputChannel.appendLine('4. Checking write permissions...');
    try {
        const testDir = fs.existsSync(configDir) ? configDir : os.homedir();
        fs.accessSync(testDir, fs.constants.W_OK);
        outputChannel.appendLine(`   PASS: Write access to ${testDir}`);
    } catch {
        outputChannel.appendLine(`   FAIL: No write access to ${configDir}`);
    }
    outputChannel.appendLine('');

    // Summary
    const allGood = cli && !error;
    if (allGood && isServerInstalled(config)) {
        outputChannel.appendLine('Result: All checks passed. AeroFTP MCP server is ready.');
        updateStatusBar('active');
    } else if (allGood) {
        outputChannel.appendLine('Result: CLI found, ready to install. Run "AeroFTP: Install MCP Server".');
        updateStatusBar('inactive');
    } else {
        outputChannel.appendLine('Result: Issues found. See details above.');
        updateStatusBar(cli ? 'error' : 'no-cli');
    }

    outputChannel.show();
}

// ── First Run ──────────────────────────────────────────────────────────

async function checkFirstRun(context: vscode.ExtensionContext): Promise<void> {
    const hasPrompted = context.globalState.get<boolean>(`${EXTENSION_ID}.prompted`);
    if (hasPrompted) {
        const { config, error } = readMcpConfig();
        if (!error && isServerInstalled(config)) {
            updateStatusBar('active');
        } else {
            const cli = await findCli();
            updateStatusBar(cli ? 'inactive' : 'no-cli');
        }
        return;
    }

    const { config } = readMcpConfig();
    if (isServerInstalled(config)) {
        await context.globalState.update(`${EXTENSION_ID}.prompted`, true);
        updateStatusBar('active');
        return;
    }

    const cli = await findCli();
    if (!cli) {
        updateStatusBar('no-cli');
        return;
    }

    updateStatusBar('inactive');

    const versionStr = cli.version ? ` (v${cli.version})` : '';
    const result = await vscode.window.showInformationMessage(
        `AeroFTP CLI detected${versionStr}. Configure the MCP server so Claude Code can manage files across 28 protocols?`,
        'Install MCP Server',
        'Not Now',
        'Never Ask Again',
    );

    if (result === 'Install MCP Server') {
        await installMcpServer();
        await context.globalState.update(`${EXTENSION_ID}.prompted`, true);
    } else if (result === 'Never Ask Again') {
        await context.globalState.update(`${EXTENSION_ID}.prompted`, true);
    }
}

// ── Lifecycle ──────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
    outputChannel = vscode.window.createOutputChannel('AeroFTP MCP');
    log('Extension activated');

    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        50,
    );

    context.subscriptions.push(
        outputChannel,
        statusBarItem,
        vscode.commands.registerCommand(`${EXTENSION_ID}.install`, installMcpServer),
        vscode.commands.registerCommand(`${EXTENSION_ID}.remove`, removeMcpServer),
        vscode.commands.registerCommand(`${EXTENSION_ID}.status`, showStatus),
        vscode.commands.registerCommand(`${EXTENSION_ID}.diagnose`, diagnose),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(`${EXTENSION_ID}.showStatusBar`)) {
                checkFirstRun(context);
            }
        }),
    );

    checkFirstRun(context);
}

export function deactivate(): void {
    log('Extension deactivated');
}
