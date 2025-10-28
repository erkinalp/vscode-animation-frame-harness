import * as vscode from 'vscode';
import { SCENARIOS, ScenarioConfig } from './scenarios';

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let currentScenario: any = null;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('RAF Harness');
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'rafHarness.stop';
    context.subscriptions.push(statusBarItem);

    outputChannel.appendLine('VSCode Animation Frame Harness activated');
    outputChannel.appendLine('Use "RAF Harness: Start Scenario" to begin profiling');

    context.subscriptions.push(
        vscode.commands.registerCommand('rafHarness.start', async () => {
            await startScenario();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rafHarness.stop', () => {
            stopScenario();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rafHarness.runScenario', async (args?: {
            scenario?: string;
            queueSize?: number;
            seed?: number;
            durationMs?: number;
        }) => {
            await runCustomScenario(args);
        })
    );

    const config = vscode.workspace.getConfiguration('rafHarness');
    if (config.get<boolean>('autoStart', false)) {
        outputChannel.appendLine('Auto-start enabled, starting scenario...');
        startScenario();
    }
}

export function deactivate() {
    stopScenario();
    if (outputChannel) {
        outputChannel.dispose();
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}

async function startScenario() {
    if (currentScenario) {
        vscode.window.showWarningMessage('Scenario already running. Stop it first.');
        return;
    }

    const config = vscode.workspace.getConfiguration('rafHarness');
    const scenarioName = config.get<string>('scenario', 'decorations-many-types');
    const scenario = SCENARIOS[scenarioName];

    if (!scenario) {
        vscode.window.showErrorMessage(`Unknown scenario: ${scenarioName}`);
        return;
    }

    const scenarioConfig: ScenarioConfig = {
        queueSize: config.get<number>('queueSize', 100),
        priorityDistribution: config.get<'uniform' | 'varied' | 'all-equal'>('priorityDistribution', 'varied'),
        seed: config.get<number>('seed', 42),
        durationMs: config.get<number>('durationMs', 10000),
        frameBudgetMs: config.get<number>('frameBudgetMs', 16)
    };

    currentScenario = scenario;
    
    statusBarItem.text = `$(sync~spin) RAF Harness: Running`;
    statusBarItem.tooltip = 'Click to stop';
    statusBarItem.show();

    outputChannel.show(true);
    outputChannel.appendLine('');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine(`Starting scenario: ${scenario.name}`);
    outputChannel.appendLine('='.repeat(80));

    try {
        await scenario.run(scenarioConfig, outputChannel);
    } catch (error) {
        outputChannel.appendLine(`Error running scenario: ${error}`);
        vscode.window.showErrorMessage(`Scenario error: ${error}`);
    } finally {
        currentScenario = null;
        statusBarItem.hide();
    }
}

function stopScenario() {
    if (!currentScenario) {
        return;
    }

    outputChannel.appendLine('');
    outputChannel.appendLine('Stopping scenario...');
    currentScenario.stop();
    currentScenario = null;
    statusBarItem.hide();
    vscode.window.showInformationMessage('RAF Harness stopped');
}

async function runCustomScenario(args?: {
    scenario?: string;
    queueSize?: number;
    seed?: number;
    durationMs?: number;
}) {
    if (currentScenario) {
        vscode.window.showWarningMessage('Scenario already running. Stop it first.');
        return;
    }

    const scenarioName = args?.scenario || 'decorations-many-types';
    const scenario = SCENARIOS[scenarioName];

    if (!scenario) {
        vscode.window.showErrorMessage(`Unknown scenario: ${scenarioName}`);
        return;
    }

    const config = vscode.workspace.getConfiguration('rafHarness');
    const scenarioConfig: ScenarioConfig = {
        queueSize: args?.queueSize || config.get<number>('queueSize', 100),
        priorityDistribution: config.get<'uniform' | 'varied' | 'all-equal'>('priorityDistribution', 'varied'),
        seed: args?.seed || config.get<number>('seed', 42),
        durationMs: args?.durationMs || config.get<number>('durationMs', 10000),
        frameBudgetMs: config.get<number>('frameBudgetMs', 16)
    };

    currentScenario = scenario;
    
    statusBarItem.text = `$(sync~spin) RAF Harness: Running`;
    statusBarItem.tooltip = 'Click to stop';
    statusBarItem.show();

    outputChannel.show(true);
    outputChannel.appendLine('');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine(`Starting custom scenario: ${scenario.name}`);
    outputChannel.appendLine('='.repeat(80));

    try {
        await scenario.run(scenarioConfig, outputChannel);
    } catch (error) {
        outputChannel.appendLine(`Error running scenario: ${error}`);
        vscode.window.showErrorMessage(`Scenario error: ${error}`);
    } finally {
        currentScenario = null;
        statusBarItem.hide();
    }
}
