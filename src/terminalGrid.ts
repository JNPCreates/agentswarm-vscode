import * as vscode from "vscode";
import { LaunchOptions } from "./config";

let outputChannel: vscode.OutputChannel | undefined;
let agentTerminals: vscode.Terminal[] = [];

export async function launchTerminalGrid(options: LaunchOptions): Promise<void> {
  const output = getOutputChannel();
  output.appendLine(
    `Launching ${options.count} terminal(s) in ${options.location}. Grid: ${options.rows}x${options.columns}.`
  );

  if (options.autoRun && options.confirmYolo && containsYolo(options.command)) {
    const choice = await vscode.window.showWarningMessage(
      `AgentSwarm will run "${options.command}" in ${options.count} terminals.`,
      { modal: true },
      "Run"
    );

    if (choice !== "Run") {
      return;
    }
  }

  if (options.location === "terminalPanel") {
    launchTerminalPanelSplits(options);
    return;
  }

  await launchEditorGrid(options);
}

async function launchEditorGrid(options: LaunchOptions): Promise<void> {
  const count = Math.min(options.rows * options.columns, 16);

  if (options.rows * options.columns > count) {
    vscode.window.showInformationMessage(
      "AgentSwarm supports up to 16 terminals per launch. Launching the first 16."
    );
  }

  try {
    await vscode.commands.executeCommand(
      "vscode.setEditorLayout",
      createEditorGridLayout(options.rows, options.columns)
    );
  } catch (error) {
    getOutputChannel().appendLine(`Editor layout failed: ${formatError(error)}`);
    vscode.window.showWarningMessage(
      "AgentSwarm could not create the editor grid layout. Launching terminals in editor tabs instead."
    );
  }

  const terminals: vscode.Terminal[] = [];

  for (let index = 0; index < count; index += 1) {
    getOutputChannel().appendLine(`Creating editor terminal ${index + 1}.`);

    const terminal = vscode.window.createTerminal({
      name: `${options.namePrefix} ${index + 1}`,
      cwd: options.cwd,
      location: {
        viewColumn: toViewColumn(index + 1),
        preserveFocus: index > 0
      }
    });

    terminals.push(terminal);
    agentTerminals.push(terminal);
    terminal.show(index > 0);
  }

  sendStartupCommand(terminals, options);
  terminals[0]?.show(true);
}

function launchTerminalPanelSplits(options: LaunchOptions): void {
  const terminals: vscode.Terminal[] = [];

  const count = Math.min(options.count, 16);

  for (let index = 0; index < count; index += 1) {
    getOutputChannel().appendLine(`Creating panel terminal ${index + 1}.`);

    const parentTerminal = terminals[0];
    const terminal = vscode.window.createTerminal({
      name: `${options.namePrefix} ${index + 1}`,
      cwd: options.cwd,
      location: parentTerminal ? { parentTerminal } : vscode.TerminalLocation.Panel
    });

    terminals.push(terminal);
    agentTerminals.push(terminal);
    terminal.show(index > 0);
  }

  sendStartupCommand(terminals, options);
  terminals[0]?.show(true);
}

export function closeAgentTerminals(namePrefix: string): number {
  const knownTerminals = new Set(agentTerminals);
  const matchingTerminals = vscode.window.terminals.filter((terminal) =>
    terminal.name.startsWith(`${namePrefix} `)
  );
  const terminalsToClose = new Set([...knownTerminals, ...matchingTerminals]);

  for (const terminal of terminalsToClose) {
    terminal.dispose();
  }

  agentTerminals = [];
  return terminalsToClose.size;
}

function sendStartupCommand(terminals: vscode.Terminal[], options: LaunchOptions): void {
  for (const terminal of terminals) {
    if (options.autoRun && options.command.length > 0) {
      terminal.sendText(options.command, true);
    }
  }
}

function containsYolo(command: string): boolean {
  return /\b--yolo\b/i.test(command);
}

interface EditorLayoutGroup {
  orientation?: 0 | 1;
  size?: number;
  groups?: EditorLayoutGroup[];
}

interface EditorLayout {
  orientation: 0 | 1;
  groups: EditorLayoutGroup[];
}

function createEditorGridLayout(rows: number, columns: number): EditorLayout {
  if (rows === 1 && columns === 1) {
    return {
      orientation: 0,
      groups: [{ size: 1 }]
    };
  }

  const groups: EditorLayoutGroup[] = [];

  for (let column = 0; column < columns; column += 1) {
    groups.push({
      orientation: 1,
      size: 1 / columns,
      groups: Array.from({ length: rows }, () => ({
        size: 1 / rows
      }))
    });
  }

  return {
    orientation: 0,
    groups
  };
}

function toViewColumn(value: number): vscode.ViewColumn {
  return value as vscode.ViewColumn;
}

function getOutputChannel(): vscode.OutputChannel {
  outputChannel ??= vscode.window.createOutputChannel("AgentSwarm");
  return outputChannel;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
