import * as vscode from "vscode";
import { getConfig, LaunchRequest, resolveLaunchOptions } from "./config";
import { closeAgentTerminals, launchTerminalGrid } from "./terminalGrid";

export class AgentSwarmControlsView implements vscode.WebviewViewProvider {
  public static readonly viewType = "agentswarm.controlsView";

  private view?: vscode.WebviewView;

  public constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    webviewView.webview.html = this.renderHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message: unknown) => {
      if (isCloseMessage(message)) {
        const config = getConfig();
        const closedCount = closeAgentTerminals(config.terminalNamePrefix.trim() || "Codex");
        vscode.window.showInformationMessage(`Closed ${closedCount} AgentSwarm terminal(s).`);
        return;
      }

      if (!isLaunchMessage(message)) {
        return;
      }

      try {
        await launchTerminalGrid(
          resolveLaunchOptions({
            count: message.count,
            rows: message.rows,
            columns: message.columns,
            command: message.command,
            autoRun: message.autoRun,
            location: message.location
          })
        );
      } catch (error) {
        vscode.window.showErrorMessage(`AgentSwarm launch failed: ${formatError(error)}`);
      }
    });
  }

  private renderHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const config = getConfig();

    return /* html */ `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentSwarm</title>
  <style>
    body {
      margin: 0;
      padding: 12px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font: var(--vscode-font-size) var(--vscode-font-family);
    }

    .stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .grid-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .grid-inputs > div {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    label {
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
    }

    input[type="number"],
    input[type="text"],
    select {
      box-sizing: border-box;
      width: 100%;
      min-height: 28px;
      padding: 4px 7px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
      border-radius: 3px;
      font-family: var(--vscode-font-family);
      outline-color: var(--vscode-focusBorder);
    }

    .check-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
      border-radius: 3px;
    }

    .check-row label {
      color: var(--vscode-foreground);
      font-size: var(--vscode-font-size);
      font-weight: 400;
    }

    .actions {
      display: grid;
      gap: 8px;
    }

    button {
      min-height: 30px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 0;
      border-radius: 3px;
      cursor: pointer;
      font-family: var(--vscode-font-family);
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }

    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    button.danger {
      color: var(--vscode-errorForeground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    }

    button.danger:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .status {
      min-height: 16px;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="stack">
    <strong>AgentSwarm Controls</strong>

    <div class="field">
      <label for="preset">Preset (Rows x Columns)</label>
      <select id="preset">
        <option value="custom">Custom</option>
        <option value="1x2">1 x 2</option>
        <option value="2x2">2 x 2</option>
        <option value="2x3">2 x 3</option>
        <option value="2x4">2 x 4</option>
        <option value="3x3">3 x 3</option>
        <option value="4x4">4 x 4</option>
      </select>
    </div>

    <div class="field">
      <label>Grid Size (Rows x Columns)</label>
      <div class="grid-inputs">
        <div>
          <label for="rows">Rows</label>
          <input id="rows" type="number" min="1" max="4" value="${escapeAttribute(String(config.rows))}">
        </div>
        <div>
          <label for="columns">Columns</label>
          <input id="columns" type="number" min="1" max="4" value="${escapeAttribute(String(config.columns))}">
        </div>
      </div>
    </div>

    <div class="field">
      <label for="command">Command</label>
      <input id="command" type="text" value="${escapeAttribute(config.startupCommand)}">
    </div>

    <div class="field">
      <label for="location">Layout</label>
      <select id="location">
        <option value="editorGrid" selected>Editor grid</option>
        <option value="terminalPanel">Terminal panel</option>
      </select>
    </div>

    <div class="check-row">
      <input id="autoRun" type="checkbox" ${config.autoRunStartupCommand ? "checked" : ""}>
      <label for="autoRun">Start with command</label>
    </div>

    <div class="actions">
      <button id="launch">Launch Grid</button>
      <button id="launchShells" class="secondary">Launch Shells Only</button>
      <button id="closeTerminals" class="danger">Close AgentSwarm Terminals</button>
    </div>

    <div id="status" class="status">Ready</div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const preset = document.getElementById("preset");
    const rows = document.getElementById("rows");
    const columns = document.getElementById("columns");
    const command = document.getElementById("command");
    const locationSelect = document.getElementById("location");
    const autoRun = document.getElementById("autoRun");
    const status = document.getElementById("status");

    function dimension(input, fallback) {
      const parsed = Number(input.value);
      if (!Number.isFinite(parsed)) {
        return fallback;
      }
      return Math.max(1, Math.min(4, Math.floor(parsed)));
    }

    function syncPreset() {
      const value = rows.value + "x" + columns.value;
      const match = Array.from(preset.options).some((option) => option.value === value);
      preset.value = match ? value : "custom";
    }

    function launch(runCommand) {
      const rowCount = dimension(rows, 2);
      const columnCount = dimension(columns, 2);
      const terminalCount = Math.min(rowCount * columnCount, 16);
      rows.value = String(rowCount);
      columns.value = String(columnCount);
      syncPreset();
      status.textContent = "Launching " + terminalCount + " terminal" + (terminalCount === 1 ? "" : "s") + "...";

      vscode.postMessage({
        type: "launchGrid",
        count: terminalCount,
        rows: rowCount,
        columns: columnCount,
        command: runCommand ? command.value : "",
        autoRun: runCommand && autoRun.checked,
        location: locationSelect.value
      });
    }

    document.getElementById("launch").addEventListener("click", () => launch(true));
    document.getElementById("launchShells").addEventListener("click", () => launch(false));
    preset.addEventListener("change", () => {
      if (preset.value === "custom") {
        return;
      }

      const parts = preset.value.split("x");
      rows.value = parts[0];
      columns.value = parts[1];
    });
    rows.addEventListener("change", syncPreset);
    columns.addEventListener("change", syncPreset);
    document.getElementById("closeTerminals").addEventListener("click", () => {
      status.textContent = "Closing AgentSwarm terminals...";
      vscode.postMessage({ type: "closeTerminals" });
    });
    syncPreset();
  </script>
</body>
</html>`;
  }
}

interface LaunchMessage extends LaunchRequest {
  type: "launchGrid";
}

interface CloseMessage {
  type: "closeTerminals";
}

function isLaunchMessage(message: unknown): message is LaunchMessage {
  return Boolean(message && typeof message === "object" && (message as { type?: unknown }).type === "launchGrid");
}

function isCloseMessage(message: unknown): message is CloseMessage {
  return Boolean(message && typeof message === "object" && (message as { type?: unknown }).type === "closeTerminals");
}

function getNonce(): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";

  for (let index = 0; index < 32; index += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
