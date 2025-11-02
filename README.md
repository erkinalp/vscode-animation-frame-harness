# VSCode Animation Frame Harness

A profiling harness to stress-test VSCode's animation frame queue with heavy extension-like workloads. This extension helps measure the performance impact of the animation frame queue processing, particularly relevant for [microsoft/vscode#272155](https://github.com/microsoft/vscode/issues/272155).

## Purpose

This harness simulates heavy extension usage by creating workloads that trigger many animation frame callbacks. It's designed to:

- Generate reproducible, deterministic scenarios for profiling
- Stress-test the animation frame queue with 50-200 callbacks
- Work with both development and release builds of VSCode
- Provide concrete measurements for performance analysis
- Profile both fresh installations and existing installations with extensions

## Installation

### From VSIX (Recommended)

1. Download the latest `.vsix` file from the releases
2. Install using the command line:
   ```bash
   code --install-extension vscode-animation-frame-harness-*.vsix
   ```
3. Or install via VSCode UI: Extensions → `...` → Install from VSIX

### From Source

```bash
git clone https://github.com/erkinalp/vscode-animation-frame-harness.git
cd vscode-animation-frame-harness
npm install
npm run compile
npm run package
code --install-extension ./vscode-animation-frame-harness-*.vsix
```

## Usage Modes

This harness supports two profiling modes:

1. **Fresh Installation Profiling**: Profile VSCode without existing extensions (isolated testing)
2. **Existing Installation Profiling**: Profile your current VSCode with all your extensions (real-world testing)

### Mode 1: Fresh Installation Profiling

Use this mode for isolated, reproducible testing without interference from other extensions.

See the [Automated Profiling](#automated-profiling) section for instructions on using a temporary profile.

### Mode 2: Existing Installation Profiling (New!)

Use this mode to understand how the animation frame queue performs with your actual extension workload. This is particularly useful for:

- Understanding real-world performance with 50+ extensions
- Measuring the incremental impact of the harness workload on top of existing extensions
- Comparing baseline performance vs. stressed performance
- Identifying whether existing extensions already stress the animation frame queue

**Key Difference**: In this mode, scenarios run as fast as possible without artificial delays, focusing on measurement rather than generating timed workloads. This allows you to observe the actual performance characteristics of your installation.

#### Workflow for Existing Installations

**Step 1: Measure Baseline Performance**

1. Install the harness in your regular VSCode (see [Installation](#installation))
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run: `RAF Harness: Measure Baseline Performance`
4. Follow the instructions in the output channel to record a baseline profile
5. Save the profile as `baseline-profile.cpuprofile`

**Step 2: Run a Scenario**

1. Configure the harness (see [Configuration](#configuration))
2. Run: `RAF Harness: Start Scenario`
3. Record another profile during the scenario
4. Save the profile as `scenario-profile.cpuprofile`

Note: Scenarios in this branch run continuously without artificial delays, allowing you to measure maximum throughput and observe performance characteristics.

**Step 3: Compare Results**

Compare the two profiles to understand:
- Baseline animation frame queue activity from your extensions
- Incremental impact of the harness workload
- Whether the animation frame queue is already a bottleneck
- Maximum update rates achievable with your configuration

**Recommended Settings for Existing Installations**

```json
{
  "rafHarness.queueSize": 100,
  "rafHarness.scenario": "decorations-many-types",
  "rafHarness.seed": 42,
  "rafHarness.durationMs": 10000,
  "rafHarness.detailedLogging": true,
  "rafHarness.baselineDurationMs": 5000
}
```

Enable `detailedLogging` to get detailed information about update rates, timing, and throughput. This helps you understand the performance characteristics of your installation and compare baseline vs. stressed scenarios.

### Quick Start (Either Mode)

1. Open VSCode
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run: `RAF Harness: Start Scenario`
4. The harness will run for 10 seconds by default
5. Check the "RAF Harness" output channel for logs

### Configuration

Configure the harness via VSCode settings (`Ctrl+,` / `Cmd+,`):

```json
{
  "rafHarness.queueSize": 100,
  "rafHarness.scenario": "decorations-many-types",
  "rafHarness.priorityDistribution": "varied",
  "rafHarness.seed": 42,
  "rafHarness.durationMs": 10000,
  "rafHarness.frameBudgetMs": 16,
  "rafHarness.autoStart": false,
  "rafHarness.detailedLogging": false,
  "rafHarness.baselineDurationMs": 5000
}
```

**Settings:**

- `queueSize`: Number of animation frame callbacks to schedule (10, 50, 100, or 200)
- `scenario`: Which scenario to run (see below)
- `priorityDistribution`: How to distribute priorities (`uniform`, `varied`, or `all-equal`)
- `seed`: Random seed for deterministic behavior
- `durationMs`: How long to run the scenario (milliseconds)
- `frameBudgetMs`: Frame budget (16ms = 60fps)
- `autoStart`: Automatically start on activation (useful for automated profiling)
- `detailedLogging`: Enable detailed performance logging (useful for existing installations)
- `baselineDurationMs`: Duration for baseline measurement (milliseconds)

### Available Scenarios

#### 1. `decorations-many-types` (Recommended)

Creates many decoration types and updates them repeatedly. This is the most effective scenario for stressing the animation frame queue.

- Creates N decoration types with unique styles
- Updates all decorations every frame
- Each update triggers animation frame callbacks

#### 2. `decorations-batch-updates`

Creates a single decoration type and performs many rapid updates using microtasks.

- Schedules many micro-updates in quick succession
- Tests burst behavior

#### 3. `edits-batch`

Performs many small text edits to trigger animation frame callbacks.

- Less effective than decoration scenarios
- Useful for testing edit-related queue behavior

### Commands

- **RAF Harness: Start Scenario** - Start the configured scenario
- **RAF Harness: Stop** - Stop the running scenario
- **RAF Harness: Run Custom Scenario** - Run with custom parameters (for scripting)
- **RAF Harness: Measure Baseline Performance** - Measure baseline performance of existing installation (for profiling with extensions)

## Profiling with Chrome DevTools

### Step 1: Enable DevTools

1. Open VSCode
2. Help → Toggle Developer Tools
3. Switch to the "Performance" tab

### Step 2: Record a Profile

1. Click the record button (●) in DevTools Performance tab
2. Start the harness: `RAF Harness: Start Scenario`
3. Let it run for the configured duration
4. Stop recording in DevTools
5. Save the profile (`.cpuprofile` file)

### Step 3: Analyze the Profile

1. In the flamegraph, search for `animationFrameRunner` or `src/vs/base/browser/dom.ts`
2. Check the total time spent in the animation frame runner
3. Look at the call count and time per call
4. Compare different queue sizes (10, 50, 100, 200)

**What to look for:**

- Time spent in `animationFrameRunner` function
- Time spent in `currentQueue.sort()` calls
- Whether time scales linearly with queue size
- Whether the runner appears as a hotspot in the profile

### Step 4: Compare Scenarios

Run multiple profiles with different configurations:

```bash
# Profile with 50 callbacks
# Set rafHarness.queueSize: 50
# Record profile → Save as profile-50.cpuprofile

# Profile with 100 callbacks
# Set rafHarness.queueSize: 100
# Record profile → Save as profile-100.cpuprofile

# Profile with 200 callbacks
# Set rafHarness.queueSize: 200
# Record profile → Save as profile-200.cpuprofile
```

## Reproducibility

All scenarios use a seeded PRNG (Mulberry32) for deterministic behavior:

- Same seed → same colors, ranges, and update patterns
- Change the seed to test different patterns
- Document the seed in your profiling results

## Automated Profiling

For automated/scripted profiling:

```bash
# Set configuration in settings.json
code --user-data-dir=/tmp/vscode-profile \
     --install-extension ./vscode-animation-frame-harness-*.vsix

# Create settings.json with desired configuration
cat > /tmp/vscode-profile/User/settings.json << EOF
{
  "rafHarness.queueSize": 100,
  "rafHarness.scenario": "decorations-many-types",
  "rafHarness.seed": 42,
  "rafHarness.durationMs": 10000,
  "rafHarness.autoStart": true
}
EOF

# Launch VSCode (harness will auto-start)
code --user-data-dir=/tmp/vscode-profile
```

## Interpreting Results

### Expected Behavior

If the animation frame queue is a bottleneck:

- Time in `animationFrameRunner` should scale with queue size
- You should see `currentQueue.sort()` appearing frequently in the flamegraph
- Median time should be > 0.5ms for 100+ callbacks

If it's NOT a bottleneck:

- Time in `animationFrameRunner` should be flat regardless of queue size
- Modern JavaScript engines (V8) may optimize the sort
- Median time should be < 0.3ms even with 200 callbacks

### Reporting Results

When sharing profiling results, include:

- VSCode version and commit hash
- Operating system and CPU
- Harness configuration (queue size, scenario, seed)
- Number of trials run (recommend 10+)
- Median time with IQR (interquartile range)
- .cpuprofile files
- Screenshots of flamegraphs (if sharing outside the repo)

## Compatibility

- **VSCode Version**: 1.80.0 or later
- **Build Types**: Works with both development and release builds
- **Platform**: Windows, macOS, Linux

This extension uses only public VSCode APIs, so it works with any VSCode build including:

- Official VSCode releases
- VSCode Insiders
- VSCodium
- Development builds from source

## Limitations

- Cannot directly access internal VSCode modules (by design)
- Relies on public APIs (decorations, edits) that internally use the animation frame queue
- Actual queue sizes may be smaller than configured if VSCode batches operations
- Results may vary based on system load and other extensions

## Contributing

This harness was created to support profiling for [microsoft/vscode#272155](https://github.com/microsoft/vscode/issues/272155). Contributions welcome:

- Additional scenarios that better stress the queue
- Improved profiling instructions
- Better documentation

## License

MIT License - See LICENSE file for details

## Related

- [VSCode Issue #272155](https://github.com/microsoft/vscode/issues/272155) - Animation frame queue performance
- [HN Discussion](https://news.ycombinator.com/item?id=45717285) - Community feedback
