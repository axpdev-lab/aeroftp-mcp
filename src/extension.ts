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

interface McpTarget {
    id: string;
    label: string;
    description: string;
    getConfigPath: () => string;
    detect: () => boolean;
}

// ── MCP Targets ────────────────────────────────────────────────────────

const MCP_TARGETS: McpTarget[] = [
    {
        id: 'claude-code',
        label: 'Claude Code',
        description: 'CLI and VS Code extension',
        getConfigPath: () => path.join(os.homedir(), '.claude', '.mcp.json'),
        detect: () => {
            const dir = path.join(os.homedir(), '.claude');
            return fs.existsSync(dir);
        },
    },
    {
        id: 'claude-desktop',
        label: 'Claude Desktop',
        description: process.platform === 'win32' ? 'Windows app' : process.platform === 'darwin' ? 'macOS app' : 'Desktop app',
        getConfigPath: () => {
            if (process.platform === 'win32') {
                return path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
            }
            if (process.platform === 'darwin') {
                return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
            }
            return path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'), 'Claude', 'claude_desktop_config.json');
        },
        detect: () => {
            if (process.platform === 'win32') {
                const dir = path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'Claude');
                return fs.existsSync(dir);
            }
            if (process.platform === 'darwin') {
                const dir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
                return fs.existsSync(dir);
            }
            const dir = path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'), 'Claude');
            return fs.existsSync(dir);
        },
    },
    {
        id: 'cursor',
        label: 'Cursor',
        description: 'AI-first code editor',
        getConfigPath: () => path.join(os.homedir(), '.cursor', 'mcp.json'),
        detect: () => {
            const dir = path.join(os.homedir(), '.cursor');
            return fs.existsSync(dir);
        },
    },
    {
        id: 'windsurf',
        label: 'Windsurf',
        description: 'Codeium IDE',
        getConfigPath: () => path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json'),
        detect: () => {
            const dir = path.join(os.homedir(), '.codeium', 'windsurf');
            return fs.existsSync(dir);
        },
    },
];

function getTargetById(id: string): McpTarget | undefined {
    return MCP_TARGETS.find(t => t.id === id);
}

// ── Output Channel ─────────────────────────────────────────────────────

let outputChannel: vscode.OutputChannel;

function log(message: string): void {
    const timestamp = new Date().toISOString().slice(11, 19);
    outputChannel.appendLine(`[${timestamp}] ${message}`);
}

// ── Status Bar ─────────────────────────────────────────────────────────

let statusBarItem: vscode.StatusBarItem;

function updateStatusBar(state: 'active' | 'partial' | 'inactive' | 'error' | 'no-cli'): void {
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
            statusBarItem.tooltip = 'AeroFTP MCP server is configured';
            statusBarItem.backgroundColor = undefined;
            break;
        case 'partial':
            statusBarItem.text = '$(check) AeroFTP MCP';
            statusBarItem.tooltip = 'AeroFTP MCP server configured in some targets - click for details';
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

function refreshStatusBar(): void {
    const cli = getConfiguredCliPath();
    const detected = MCP_TARGETS.filter(t => t.detect());
    const installed = detected.filter(t => {
        const { config, error } = readMcpConfigAt(t.getConfigPath());
        return !error && isServerInstalled(config);
    });

    if (detected.length === 0 && !cli) {
        updateStatusBar('no-cli');
    } else if (installed.length > 0 && installed.length === detected.length) {
        updateStatusBar('active');
    } else if (installed.length > 0) {
        updateStatusBar('partial');
    } else {
        updateStatusBar('inactive');
    }
}

// ── MCP Config (generic) ──────────────────────────────────────────────

function readMcpConfigAt(configPath: string): { config: McpConfig; error: string | null } {
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

function writeMcpConfigAt(configPath: string, config: McpConfig): string | null {
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

// ── Target Picker ──────────────────────────────────────────────────────

interface TargetPickItem extends vscode.QuickPickItem {
    target: McpTarget;
}

async function pickTargets(action: 'install' | 'remove'): Promise<McpTarget[] | null> {
    const detected = MCP_TARGETS.filter(t => t.detect());
    const allTargets = MCP_TARGETS;

    const items: TargetPickItem[] = allTargets.map(t => {
        const configPath = t.getConfigPath();
        const { config, error } = readMcpConfigAt(configPath);
        const installed = !error && isServerInstalled(config);
        const exists = detected.includes(t);

        let status: string;
        if (!exists) {
            status = 'not detected';
        } else if (installed) {
            status = 'configured';
        } else {
            status = 'not configured';
        }

        const shouldPick = action === 'install'
            ? exists && !installed
            : exists && installed;

        return {
            label: t.label,
            description: `${t.description} - ${status}`,
            detail: configPath,
            picked: shouldPick,
            target: t,
        };
    });

    const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        title: action === 'install'
            ? 'Select targets to install AeroFTP MCP server'
            : 'Select targets to remove AeroFTP MCP server',
        placeHolder: action === 'install'
            ? 'Choose where to register the MCP server'
            : 'Choose where to remove the MCP server',
    });

    if (!selected || selected.length === 0) {
        return null;
    }

    return selected.map(s => s.target);
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

    const targets = await pickTargets('install');
    if (!targets) {
        return;
    }

    const cliCommand = getConfiguredCliPath() || MCP_COMMAND;
    const results: { target: McpTarget; success: boolean; error?: string }[] = [];

    for (const target of targets) {
        const configPath = target.getConfigPath();
        const { config, error } = readMcpConfigAt(configPath);

        if (error) {
            log(`Config error for ${target.label}: ${error}`);
            results.push({ target, success: false, error });
            continue;
        }

        if (isServerInstalled(config)) {
            const existing = config.mcpServers![MCP_SERVER_NAME];
            const currentCmd = `${existing.command} ${(existing.args ?? []).join(' ')}`;
            const newCmd = `${cliCommand} ${MCP_ARGS.join(' ')}`;
            if (currentCmd === newCmd) {
                results.push({ target, success: true });
                continue;
            }
        }

        if (!config.mcpServers) {
            config.mcpServers = {};
        }

        config.mcpServers[MCP_SERVER_NAME] = {
            command: cliCommand,
            args: MCP_ARGS,
        };

        const writeError = writeMcpConfigAt(configPath, config);
        if (writeError) {
            log(`Write error for ${target.label}: ${writeError}`);
            results.push({ target, success: false, error: writeError });
        } else {
            log(`MCP server installed for ${target.label}`);
            results.push({ target, success: true });
        }
    }

    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (succeeded.length > 0) {
        const names = succeeded.map(r => r.target.label).join(', ');
        const versionStr = cli.version ? ` v${cli.version}` : '';
        vscode.window.showInformationMessage(
            `AeroFTP MCP server configured${versionStr} for: ${names}`,
            'View Documentation',
        ).then(action => {
            if (action === 'View Documentation') {
                vscode.env.openExternal(vscode.Uri.parse(DOCS_URL));
            }
        });
    }

    if (failed.length > 0) {
        const names = failed.map(r => `${r.target.label}: ${r.error}`).join('; ');
        vscode.window.showErrorMessage(`Failed for: ${names}`);
    }

    refreshStatusBar();
}

async function removeMcpServer(): Promise<void> {
    log('Remove command triggered');

    const targets = await pickTargets('remove');
    if (!targets) {
        return;
    }

    const names = targets.map(t => t.label).join(', ');
    const confirm = await vscode.window.showWarningMessage(
        `Remove AeroFTP MCP server from: ${names}?`,
        { modal: true, detail: 'The selected tools will no longer have access to AeroFTP file management tools.' },
        'Remove',
    );
    if (confirm !== 'Remove') {
        return;
    }

    const errors: string[] = [];

    for (const target of targets) {
        const configPath = target.getConfigPath();
        const { config, error } = readMcpConfigAt(configPath);

        if (error) {
            errors.push(`${target.label}: ${error}`);
            continue;
        }

        if (!isServerInstalled(config)) {
            continue;
        }

        delete config.mcpServers![MCP_SERVER_NAME];
        if (Object.keys(config.mcpServers!).length === 0) {
            delete config.mcpServers;
        }

        const writeError = writeMcpConfigAt(configPath, config);
        if (writeError) {
            errors.push(`${target.label}: ${writeError}`);
        } else {
            log(`MCP server removed from ${target.label}`);
        }
    }

    if (errors.length > 0) {
        vscode.window.showErrorMessage(`Errors: ${errors.join('; ')}`);
    } else {
        vscode.window.showInformationMessage(`AeroFTP MCP server removed from: ${names}`);
    }

    refreshStatusBar();
}

async function showStatus(): Promise<void> {
    log('Status command triggered');

    const cli = await findCli();

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

    // Per-target status
    outputChannel.appendLine('--- Targets ---');
    outputChannel.appendLine('');

    let anyInstalled = false;
    let anyDetected = false;

    for (const target of MCP_TARGETS) {
        const detected = target.detect();
        const configPath = target.getConfigPath();
        const { config, error } = readMcpConfigAt(configPath);
        const installed = !error && isServerInstalled(config);

        if (detected) {
            anyDetected = true;
        }
        if (installed) {
            anyInstalled = true;
        }

        const icon = installed ? '[OK]' : detected ? '[--]' : '[  ]';
        const status = installed ? 'CONFIGURED' : detected ? 'NOT CONFIGURED' : 'NOT DETECTED';

        outputChannel.appendLine(`${icon} ${target.label} (${target.description})`);
        outputChannel.appendLine(`     Status: ${status}`);
        outputChannel.appendLine(`     Config: ${configPath}`);

        if (error) {
            outputChannel.appendLine(`     Error:  ${error}`);
        }

        if (installed) {
            const serverConfig = config.mcpServers![MCP_SERVER_NAME];
            outputChannel.appendLine(`     Command: ${serverConfig.command} ${(serverConfig.args ?? []).join(' ')}`);
        }

        // Other MCP servers
        if (config.mcpServers) {
            const others = Object.keys(config.mcpServers).filter(k => k !== MCP_SERVER_NAME);
            if (others.length > 0) {
                outputChannel.appendLine(`     Other servers: ${others.join(', ')}`);
            }
        }

        outputChannel.appendLine('');
    }

    // Platform
    outputChannel.appendLine('--- System ---');
    outputChannel.appendLine('');
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
    } else if (anyDetected && !anyInstalled) {
        const action = await vscode.window.showInformationMessage(
            'AeroFTP CLI detected but MCP server not configured in any target.',
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

    // Step 3: Per-target checks
    outputChannel.appendLine('3. Checking MCP targets...');
    let step = 0;
    for (const target of MCP_TARGETS) {
        step++;
        const detected = target.detect();
        const configPath = target.getConfigPath();

        outputChannel.appendLine(`   3.${step}. ${target.label}:`);

        if (!detected) {
            outputChannel.appendLine(`        SKIP: Not detected on this system`);
            outputChannel.appendLine(`        Path: ${configPath}`);
            continue;
        }

        outputChannel.appendLine(`        PASS: Detected`);

        const { config, error } = readMcpConfigAt(configPath);
        if (error) {
            outputChannel.appendLine(`        FAIL: ${error}`);
            continue;
        }

        if (isServerInstalled(config)) {
            outputChannel.appendLine(`        PASS: AeroFTP MCP server configured`);
        } else {
            outputChannel.appendLine(`        INFO: AeroFTP MCP server not yet configured`);
        }

        // Write permission check
        const dir = path.dirname(configPath);
        try {
            const testDir = fs.existsSync(dir) ? dir : os.homedir();
            fs.accessSync(testDir, fs.constants.W_OK);
            outputChannel.appendLine(`        PASS: Write access OK`);
        } catch {
            outputChannel.appendLine(`        FAIL: No write access to ${dir}`);
        }
    }
    outputChannel.appendLine('');

    // Summary
    const detected = MCP_TARGETS.filter(t => t.detect());
    const installed = detected.filter(t => {
        const { config, error } = readMcpConfigAt(t.getConfigPath());
        return !error && isServerInstalled(config);
    });

    if (installed.length === detected.length && detected.length > 0) {
        outputChannel.appendLine(`Result: All ${installed.length} detected target(s) configured.`);
    } else if (installed.length > 0) {
        outputChannel.appendLine(`Result: ${installed.length}/${detected.length} target(s) configured.`);
    } else if (detected.length > 0) {
        outputChannel.appendLine('Result: CLI found but no targets configured. Run "AeroFTP: Install MCP Server".');
    } else {
        outputChannel.appendLine('Result: No MCP-compatible tools detected on this system.');
    }

    outputChannel.show();
    refreshStatusBar();
}

// ── First Run ──────────────────────────────────────────────────────────

async function checkFirstRun(context: vscode.ExtensionContext): Promise<void> {
    const hasPrompted = context.globalState.get<boolean>(`${EXTENSION_ID}.prompted`);
    if (hasPrompted) {
        refreshStatusBar();
        return;
    }

    // Check if already installed in any target
    const anyInstalled = MCP_TARGETS.some(t => {
        const { config, error } = readMcpConfigAt(t.getConfigPath());
        return !error && isServerInstalled(config);
    });

    if (anyInstalled) {
        await context.globalState.update(`${EXTENSION_ID}.prompted`, true);
        refreshStatusBar();
        return;
    }

    const cli = await findCli();
    if (!cli) {
        refreshStatusBar();
        return;
    }

    refreshStatusBar();

    const detected = MCP_TARGETS.filter(t => t.detect());
    const targetNames = detected.map(t => t.label).join(', ');
    const versionStr = cli.version ? ` (v${cli.version})` : '';

    const result = await vscode.window.showInformationMessage(
        `AeroFTP CLI detected${versionStr}. Configure the MCP server for ${targetNames || 'available tools'}?`,
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
                refreshStatusBar();
            }
        }),
    );

    checkFirstRun(context);
}

export function deactivate(): void {
    log('Extension deactivated');
}
