import * as vscode from 'vscode';
import { SeededRandom } from './prng';

export interface ScenarioConfig {
    queueSize: number;
    priorityDistribution: 'uniform' | 'varied' | 'all-equal';
    seed: number;
    durationMs: number;
    frameBudgetMs: number;
}

export interface Scenario {
    name: string;
    run(config: ScenarioConfig, outputChannel: vscode.OutputChannel): Promise<void>;
    stop(): void;
}

/**
 * Scenario that creates many decoration types to stress the animation frame queue.
 * Each decoration type update typically schedules animation frame callbacks.
 */
export class DecorationsManyTypesScenario implements Scenario {
    name = 'decorations-many-types';
    private decorationTypes: vscode.TextEditorDecorationType[] = [];
    private editor: vscode.TextEditor | undefined;
    private intervalId: NodeJS.Timeout | undefined;
    private stopped = false;

    async run(config: ScenarioConfig, outputChannel: vscode.OutputChannel): Promise<void> {
        this.stopped = false;
        const rng = new SeededRandom(config.seed);

        outputChannel.appendLine(`[${new Date().toISOString()}] Starting ${this.name} scenario`);
        outputChannel.appendLine(`  Queue size: ${config.queueSize}`);
        outputChannel.appendLine(`  Priority distribution: ${config.priorityDistribution}`);
        outputChannel.appendLine(`  Seed: ${config.seed}`);
        outputChannel.appendLine(`  Duration: ${config.durationMs}ms`);

        this.editor = vscode.window.activeTextEditor;
        if (!this.editor) {
            const doc = await vscode.workspace.openTextDocument({
                content: this.generateDeterministicContent(rng, 1000),
                language: 'plaintext'
            });
            this.editor = await vscode.window.showTextDocument(doc);
        }

        const colors = this.generateColors(rng, config.queueSize);
        for (let i = 0; i < config.queueSize; i++) {
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: colors[i],
                border: `1px solid ${colors[i]}`,
                isWholeLine: false
            });
            this.decorationTypes.push(decorationType);
        }

        outputChannel.appendLine(`  Created ${this.decorationTypes.length} decoration types`);

        const startTime = Date.now();
        const updateDecorations = () => {
            if (this.stopped || Date.now() - startTime >= config.durationMs) {
                this.stop();
                outputChannel.appendLine(`[${new Date().toISOString()}] Scenario completed`);
                return;
            }

            if (!this.editor) {
                return;
            }

            for (let i = 0; i < this.decorationTypes.length; i++) {
                const ranges = this.generateRanges(rng, this.editor.document, 3);
                this.editor.setDecorations(this.decorationTypes[i], ranges);
            }
        };

        this.intervalId = setInterval(updateDecorations, config.frameBudgetMs);
        updateDecorations(); // Initial update
    }

    stop(): void {
        this.stopped = true;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }

        for (const decorationType of this.decorationTypes) {
            decorationType.dispose();
        }
        this.decorationTypes = [];
    }

    private generateDeterministicContent(rng: SeededRandom, lines: number): string {
        const words = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'test', 'code'];
        const result: string[] = [];
        for (let i = 0; i < lines; i++) {
            const lineLength = rng.nextInt(5, 15);
            const line = Array.from({ length: lineLength }, () => rng.choice(words)).join(' ');
            result.push(line);
        }
        return result.join('\n');
    }

    private generateColors(rng: SeededRandom, count: number): string[] {
        const colors: string[] = [];
        for (let i = 0; i < count; i++) {
            const r = rng.nextInt(100, 255);
            const g = rng.nextInt(100, 255);
            const b = rng.nextInt(100, 255);
            const a = 0.1 + rng.next() * 0.2; // Low opacity to avoid visual clutter
            colors.push(`rgba(${r}, ${g}, ${b}, ${a})`);
        }
        return colors;
    }

    private generateRanges(rng: SeededRandom, document: vscode.TextDocument, count: number): vscode.Range[] {
        const ranges: vscode.Range[] = [];
        const lineCount = document.lineCount;
        
        for (let i = 0; i < count; i++) {
            const line = rng.nextInt(0, lineCount);
            const lineText = document.lineAt(line).text;
            const startChar = rng.nextInt(0, Math.max(1, lineText.length - 5));
            const endChar = Math.min(startChar + rng.nextInt(1, 10), lineText.length);
            ranges.push(new vscode.Range(line, startChar, line, endChar));
        }
        
        return ranges;
    }
}

/**
 * Scenario that batches decoration updates to create bursts of animation frame callbacks
 */
export class DecorationsBatchUpdatesScenario implements Scenario {
    name = 'decorations-batch-updates';
    private decorationType: vscode.TextEditorDecorationType | undefined;
    private editor: vscode.TextEditor | undefined;
    private intervalId: NodeJS.Timeout | undefined;
    private stopped = false;

    async run(config: ScenarioConfig, outputChannel: vscode.OutputChannel): Promise<void> {
        this.stopped = false;
        const rng = new SeededRandom(config.seed);

        outputChannel.appendLine(`[${new Date().toISOString()}] Starting ${this.name} scenario`);
        outputChannel.appendLine(`  Queue size: ${config.queueSize}`);
        outputChannel.appendLine(`  Seed: ${config.seed}`);
        outputChannel.appendLine(`  Duration: ${config.durationMs}ms`);

        this.editor = vscode.window.activeTextEditor;
        if (!this.editor) {
            const doc = await vscode.workspace.openTextDocument({
                content: Array.from({ length: 1000 }, (_, i) => `Line ${i}`).join('\n'),
                language: 'plaintext'
            });
            this.editor = await vscode.window.showTextDocument(doc);
        }

        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 200, 0, 0.2)'
        });

        const startTime = Date.now();
        const batchUpdate = () => {
            if (this.stopped || Date.now() - startTime >= config.durationMs) {
                this.stop();
                outputChannel.appendLine(`[${new Date().toISOString()}] Scenario completed`);
                return;
            }

            if (!this.editor || !this.decorationType) {
                return;
            }

            for (let i = 0; i < config.queueSize; i++) {
                const ranges = this.generateRanges(rng, this.editor.document, 1);
                queueMicrotask(() => {
                    if (this.editor && this.decorationType) {
                        this.editor.setDecorations(this.decorationType, ranges);
                    }
                });
            }
        };

        this.intervalId = setInterval(batchUpdate, config.frameBudgetMs * 2);
        batchUpdate(); // Initial batch
    }

    stop(): void {
        this.stopped = true;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }

        if (this.decorationType) {
            this.decorationType.dispose();
            this.decorationType = undefined;
        }
    }

    private generateRanges(rng: SeededRandom, document: vscode.TextDocument, count: number): vscode.Range[] {
        const ranges: vscode.Range[] = [];
        const lineCount = document.lineCount;
        
        for (let i = 0; i < count; i++) {
            const line = rng.nextInt(0, lineCount);
            const lineText = document.lineAt(line).text;
            const startChar = rng.nextInt(0, Math.max(1, lineText.length - 5));
            const endChar = Math.min(startChar + rng.nextInt(1, 10), lineText.length);
            ranges.push(new vscode.Range(line, startChar, line, endChar));
        }
        
        return ranges;
    }
}

/**
 * Scenario that performs many small edits to trigger animation frame callbacks
 */
export class EditsBatchScenario implements Scenario {
    name = 'edits-batch';
    private editor: vscode.TextEditor | undefined;
    private intervalId: NodeJS.Timeout | undefined;
    private stopped = false;

    async run(config: ScenarioConfig, outputChannel: vscode.OutputChannel): Promise<void> {
        this.stopped = false;
        const rng = new SeededRandom(config.seed);

        outputChannel.appendLine(`[${new Date().toISOString()}] Starting ${this.name} scenario`);
        outputChannel.appendLine(`  Queue size: ${config.queueSize}`);
        outputChannel.appendLine(`  Seed: ${config.seed}`);
        outputChannel.appendLine(`  Duration: ${config.durationMs}ms`);

        this.editor = vscode.window.activeTextEditor;
        if (!this.editor) {
            const doc = await vscode.workspace.openTextDocument({
                content: Array.from({ length: 100 }, (_, i) => `Line ${i}`).join('\n'),
                language: 'plaintext'
            });
            this.editor = await vscode.window.showTextDocument(doc);
        }

        const startTime = Date.now();
        const batchEdit = async () => {
            if (this.stopped || Date.now() - startTime >= config.durationMs) {
                this.stop();
                outputChannel.appendLine(`[${new Date().toISOString()}] Scenario completed`);
                return;
            }

            if (!this.editor) {
                return;
            }

            await this.editor.edit(editBuilder => {
                if (!this.editor) {
                    return;
                }
                
                for (let i = 0; i < Math.min(config.queueSize, 50); i++) {
                    const line = rng.nextInt(0, this.editor.document.lineCount);
                    const position = new vscode.Position(line, 0);
                    editBuilder.insert(position, rng.choice(['x', 'y', 'z']));
                }
            });
        };

        this.intervalId = setInterval(batchEdit, config.frameBudgetMs * 3);
        await batchEdit(); // Initial batch
    }

    stop(): void {
        this.stopped = true;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }
}

export const SCENARIOS: { [key: string]: Scenario } = {
    'decorations-many-types': new DecorationsManyTypesScenario(),
    'decorations-batch-updates': new DecorationsBatchUpdatesScenario(),
    'edits-batch': new EditsBatchScenario()
};
