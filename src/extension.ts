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

    context.subscriptions.push(
        vscode.commands.registerCommand('rafHarness.measureBaseline', async () => {
            await measureBaseline();
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
        frameBudgetMs: config.get<number>('frameBudgetMs', 16),
        detailedLogging: config.get<boolean>('detailedLogging', false)
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
        frameBudgetMs: config.get<number>('frameBudgetMs', 16),
        detailedLogging: config.get<boolean>('detailedLogging', false)
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

async function measureBaseline() {
    const config = vscode.workspace.getConfiguration('rafHarness');
    const durationMs = config.get<number>('baselineDurationMs', 5000);

    outputChannel.show(true);
    outputChannel.appendLine('');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine('Measuring Baseline Performance');
    outputChannel.appendLine('='.repeat(80));
    outputChannel.appendLine(`Duration: ${durationMs}ms`);
    outputChannel.appendLine('');
    outputChannel.appendLine('This measurement captures the current performance characteristics');
    outputChannel.appendLine('of your VS Code installation with all active extensions.');
    outputChannel.appendLine('');
    outputChannel.appendLine('Instructions:');
    outputChannel.appendLine('1. Open Chrome DevTools (Help → Toggle Developer Tools)');
    outputChannel.appendLine('2. Go to the Performance tab');
    outputChannel.appendLine('3. Click the record button (●)');
    outputChannel.appendLine('4. Wait for the measurement to complete');
    outputChannel.appendLine('5. Stop recording and save the profile');
    outputChannel.appendLine('');
    outputChannel.appendLine('After baseline measurement, run a scenario with the same duration');
    outputChannel.appendLine('to compare the incremental impact of the harness workload.');
    outputChannel.appendLine('');

    statusBarItem.text = `$(sync~spin) RAF Harness: Baseline`;
    statusBarItem.tooltip = 'Measuring baseline performance';
    statusBarItem.show();

    const startTime = Date.now();
    outputChannel.appendLine(`[${new Date().toISOString()}] Baseline measurement started`);

    await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= durationMs) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });

    outputChannel.appendLine(`[${new Date().toISOString()}] Baseline measurement completed`);
    outputChannel.appendLine('');
    outputChannel.appendLine('Next steps:');
    outputChannel.appendLine('1. Save your baseline profile as "baseline-profile.cpuprofile"');
    outputChannel.appendLine('2. Run a scenario: "RAF Harness: Start Scenario"');
    outputChannel.appendLine('3. Record another profile and save as "scenario-profile.cpuprofile"');
    outputChannel.appendLine('4. Compare the two profiles to see the incremental impact');
    outputChannel.appendLine('');

    statusBarItem.hide();
    vscode.window.showInformationMessage('Baseline measurement completed. Check the RAF Harness output channel.');
}
