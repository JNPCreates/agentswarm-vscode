import * as vscode from "vscode";
import { AgentSwarmControlsView } from "./controlsView";
import { getConfig, resolveLaunchOptions } from "./config";
import { closeAgentTerminals, launchTerminalGrid } from "./terminalGrid";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("AgentSwarm");
  output.appendLine("AgentSwarm activating.");

  try {
    const controlsView = new AgentSwarmControlsView(context.extensionUri);

    context.subscriptions.push(
      output,
      vscode.window.registerWebviewViewProvider(AgentSwarmControlsView.viewType, controlsView, {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }),
      vscode.commands.registerCommand("agentswarm.launchGrid", async () => {
        await launchTerminalGrid(resolveLaunchOptions());
      }),
      vscode.commands.registerCommand("agentswarm.launchShells", async () => {
        await launchTerminalGrid(
          resolveLaunchOptions({
            command: "",
            autoRun: false
          })
        );
      }),
      vscode.commands.registerCommand("agentswarm.closeTerminals", () => {
        const config = getConfig();
        const closedCount = closeAgentTerminals(config.terminalNamePrefix.trim() || "Codex");
        vscode.window.showInformationMessage(`Closed ${closedCount} AgentSwarm terminal(s).`);
      }),
      vscode.commands.registerCommand("agentswarm.showSidebar", async () => {
        await vscode.commands.executeCommand("workbench.view.extension.agentswarm");
      })
    );

    output.appendLine("AgentSwarm activated.");
  } catch (error) {
    const message = formatError(error);
    output.appendLine(`AgentSwarm activation failed: ${message}`);
    vscode.window.showErrorMessage(`AgentSwarm activation failed: ${message}`);
    throw error;
  }
}

export function deactivate(): void {}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
