# AgentSwarm

AgentSwarm is a VS Code extension for launching multiple agent terminals from a sidebar.

It is built for workflows where you want several Codex sessions, shell sessions, or other CLI agents open at once in a predictable editor grid.

## Features

- Launch terminals from a dedicated Activity Bar sidebar.
- Choose common grid presets such as `1 x 2`, `2 x 2`, `2 x 3`, and `2 x 4`.
- Manually set rows and columns.
- Run the same startup command in every terminal.
- Default startup command: `codex --yolo`.
- Launch shells without running a command.
- Close all AgentSwarm-launched terminals at once.
- Use editor-grid terminals for a true row/column layout.

## Usage

1. Open the AgentSwarm icon in the Activity Bar.
2. Choose a preset or set rows and columns manually.
3. Set the command you want each terminal to run.
4. Enable `Start with command` if you want AgentSwarm to execute the command automatically.
5. Click `Launch Grid`.

`Rows x Columns` means:

```text
2 x 4 = 2 rows, 4 columns
```

## Safety

AgentSwarm defaults to `codex --yolo`, but it does not auto-run the command unless `Start with command` is enabled.

Commands that include `--yolo` can make broad filesystem changes. Review the workspace before launching multiple agents with auto-run enabled.

## Development

Install dependencies:

```powershell
npm install
```

Compile:

```powershell
npm run compile
```

Run in an Extension Development Host:

1. Open this folder in VS Code.
2. Press `F5`.
3. In the Extension Development Host, open the AgentSwarm icon in the Activity Bar.

Package locally:

```powershell
npx @vscode/vsce package
```

Install the local VSIX:

```powershell
code --install-extension .\agentswarm-vscode-0.0.6.vsix --force
```

## License

MIT
