import * as vscode from "vscode";

export interface AgentSwarmConfig {
  terminalCount: number;
  rows: number;
  columns: number;
  startupCommand: string;
  autoRunStartupCommand: boolean;
  terminalNamePrefix: string;
  cwd: string;
  confirmYolo: boolean;
  terminalLocation: TerminalLaunchLocation;
}

export interface LaunchRequest {
  count?: number;
  rows?: number;
  columns?: number;
  command?: string;
  autoRun?: boolean;
  location?: TerminalLaunchLocation;
}

export interface LaunchOptions {
  count: number;
  rows: number;
  columns: number;
  command: string;
  autoRun: boolean;
  namePrefix: string;
  cwd: string;
  confirmYolo: boolean;
  location: TerminalLaunchLocation;
}

export type TerminalLaunchLocation = "editorGrid" | "terminalPanel";

export function getConfig(): AgentSwarmConfig {
  const config = vscode.workspace.getConfiguration("agentswarm");

  return {
    terminalCount: clampCount(config.get<number>("terminalCount", 4)),
    rows: clampDimension(config.get<number>("rows", 2)),
    columns: clampDimension(config.get<number>("columns", 2)),
    startupCommand: config.get<string>("startupCommand", "codex --yolo"),
    autoRunStartupCommand: config.get<boolean>("autoRunStartupCommand", false),
    terminalNamePrefix: config.get<string>("terminalNamePrefix", "Codex"),
    cwd: config.get<string>("cwd", ""),
    confirmYolo: config.get<boolean>("confirmYolo", true),
    terminalLocation: normalizeLocation(config.get<string>("terminalLocation", "editorGrid"))
  };
}

export function resolveLaunchOptions(request: LaunchRequest = {}): LaunchOptions {
  const config = getConfig();
  const rows = clampDimension(request.rows ?? config.rows);
  const columns = clampDimension(request.columns ?? config.columns);
  const count = request.count === undefined ? rows * columns : clampCount(request.count);

  return {
    count,
    rows,
    columns,
    command: normalizeCommand(request.command ?? config.startupCommand),
    autoRun: request.autoRun ?? config.autoRunStartupCommand,
    namePrefix: config.terminalNamePrefix.trim() || "Codex",
    cwd: resolveCwd(config.cwd),
    confirmYolo: config.confirmYolo,
    location: request.location ?? config.terminalLocation
  };
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 4;
  }

  return Math.max(1, Math.min(16, Math.floor(value)));
}

function clampDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return 2;
  }

  return Math.max(1, Math.min(4, Math.floor(value)));
}

function normalizeCommand(value: string): string {
  return value.trim();
}

function resolveCwd(configuredCwd: string): string {
  const trimmed = configuredCwd.trim();

  if (trimmed.length > 0) {
    return trimmed;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  return workspaceFolder?.uri.fsPath ?? process.cwd();
}

function normalizeLocation(value: string): TerminalLaunchLocation {
  return value === "terminalPanel" ? "terminalPanel" : "editorGrid";
}
