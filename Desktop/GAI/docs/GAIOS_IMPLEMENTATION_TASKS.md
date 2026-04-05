# GAIOS Implementation Tasks (Execution Tracker)

This file is the canonical operational tracker for system status after closure sweeps.

- Historical design source: `docs/GAIOS_NEXT_LEVEL_MASTERPLAN.md`
- Canonical closure/state sources: `docs/final_roadmap_closure_report.md`, `docs/final_system_status_decision.md`

Use it to track what is done, what is next, and what is blocked. Keep it updated while implementing.

## Status Legend
- [ ] not started
- [~] in progress
- [x] done
- [!] blocked
- [>] deferred

## Global Rules (Do Not Skip)
- Preserve behavior first, then improve behavior.
- Do not refactor runtime boundaries and UI store in the same PR.
- Every PR must have an explicit rollback strategy.
- Every PR must define validation steps (manual or automated).
- Live chat (Brain) must remain stable at every step.

## Milestones

### M0 - Baseline & Guardrails
- [x] Document baseline build/run commands that actually work locally
- [x] Add a minimal smoke suite: live chat, one tool call, one task progression
- [x] Add a regression note template for PR descriptions

### M1 - Shared Tool Runtime (P0)
- [x] Create `services/runtime/` directory scaffold
- [x] Add `services/runtime/toolRuntime.js` (initial skeleton + types/contracts)
- [x] Move tool parsing/normalization into toolRuntime (no behavior change)
- [x] Add adapter in `server.js` so existing callers still work
- [x] Add adapter in `services/toolExecutor.js` (agent path)
- [x] Switch `services/agentRouter.js` to use shared toolRuntime (behind a flag at first)
- [ ] Remove duplicate logic once parity is confirmed

### M2 - Brain vs Agents Contract (P0)
- [x] Add message/task metadata: `interactionMode`, `responseOrigin`
- [x] Enforce: live chat -> Brain only
- [x] Enforce: agent-router only for task intents
- [x] Remove all auto-ack/preamble leakage from live chat
- [x] Update terminal filters to use metadata (not text heuristics)
- [x] Add UI label: LIVE / Brain vs TASK / Brain + Agents

### M3 - Task OS 2.0 (P0)
- [x] Extend task schema in `types.ts`
- [x] Add `definitionOfDone` to every task created by Brain
- [x] Add `verificationPlan` and `evidenceRequired`
- [x] Add `rollbackCheckpointId` linkage
- [x] Add task state machine guards:
  - [x] cannot complete without evidence
  - [x] cannot complete without verification result
- [x] Update TaskManager UI to render new fields

### M4 - Verification Runtime (P0)
- [x] Create `services/runtime/verificationRuntime.js`
- [x] Implement verify-before-complete orchestration
- [x] Add verification artifacts storage model
- [x] Integrate verification into task completion path
- [x] Render verification results in Terminal trace and TaskManager

### M5 - Checkpoints & Rollback (P0)
- [x] Create `services/runtime/checkpointRuntime.js`
- [x] Create checkpoints before risky file writes
- [x] Create checkpoints before multi-step tool sequences
- [x] Create checkpoints before marking tasks completed
- [x] Add rollback command/API and UI entry points
- [x] Ensure rollback writes an execution trace event

### M6 - Execution Trace v1 (P1)
- [x] Create `services/runtime/traceRuntime.js` event schema
- [x] Normalize tool/task/verify/checkpoint events into a single timeline
- [x] Replace fragmented panels with one Execution Trace rail
- [x] Add deep links: task -> run -> file -> checkpoint
- [x] Add diff deep links for changed files
- [x] Ensure trace works both for autonomy and user-driven tasks

### M7 - Unified UI Store (P1)
- [x] Decide store approach (`useSyncExternalStore`)
- [x] Implement shared store for system state
- [x] Replace ad hoc polling loops in:
- [x] TerminalApp
- [x] TaskManager
- [x] Taskbar
- [x] TopBar
- [x] Add selectors and memoization to reduce rerenders

### M8 - Operational Memory (P1)
- [x] Add lessons-learned memory category
- [x] Store lessons after each completed task
- [x] Add usefulness scoring based on outcomes
- [x] Retrieval-before-task-execution using lessons
- [x] Add pruning of low-value memories

### M9 - Eval Harness (P2)
- [x] Create `evals/` directory structure
- [x] Define baseline scenarios (50+ tasks)
- [x] Add machine-readable results export format
- [x] Add human-readable report
- [x] Add CI regression gating for core scenarios

### M10 - Builder Workspace v1 (P2)
- [x] Rebuild CodeStudio into the primary builder workspace
- [x] Add Goal/Plan pane
- [x] Add Files/Diff/Preview pane
- [x] Add Verify/Evidence pane
- [x] Add Retry/Rollback controls
- [x] Tie workspace directly into Execution Trace

### M11 - Prompt Compiler v1 (P2)
- [x] Extract shared prompt compiler for live and task flows
- [x] Add unified task contract context (`goal`, DoD, verification, evidence)
- [x] Add execution trace and checkpoint context to task prompts
- [x] Inject lessons and tool memory in a single compiler path
- [x] Keep budget-aware prompt shrinking for live prompts
- [x] Reuse compiled prompt format for pending task initialization

### M12 - Runtime Policies v2 (P2)
- [x] Unify runtime policy config for retries, backoff and loop limits
- [x] Emit auditable policy decisions to trace/logs
- [x] Apply shared policy thresholds to no-tools, repeated reads and low-success tools
- [x] Align loop breaker runtime with operator-configured limits
- [x] Apply shared retry/escalation budgets to watchdog and loop breaker
- [x] Preserve extended autonomy policy fields in Settings UI

### M13 - Operator Observability Consolidation (P2)
- [x] Extend trace contract with `runtime_policy`
- [x] Consolidate trace, policy events and task notifications in one workspace rail
- [x] Add policy-focused filtering in the operator workspace
- [x] Add deep-link opening from observability events to file/checkpoint context
- [x] Fix Ollama trace parsing regression in TaskManager
- [x] Keep TaskManager and CodeStudio aligned on observability data

### M14 - Operator Policy & Incident Console (P2)
- [x] Extend autonomy telemetry with policy summaries and recent decisions
- [x] Add operator console cards for policy mix and telemetry drill-down
- [x] Add unresolved incident inbox in the builder workspace
- [x] Add resolve action for safety incidents from the workspace
- [x] Add lockdown visibility and policy totals in the operator console
- [x] Keep observability, telemetry and incident surfaces aligned

### M15 - Operator Analytics & Quality Scoreboard (P2)
- [x] Extend telemetry with policy source/time-window analytics
- [x] Add quality scoreboard sourced from the latest eval report
- [x] Extend safety status with resolved history and incident analytics
- [x] Add MTTR/aging/top-rules cards to the operator console
- [x] Expose full runtime policy knobs in Settings
- [x] Keep analytics surfaces aligned with telemetry and safety APIs

### M16 - Persistent History & Trend Snapshots (P2)
- [x] Persist safety incident history in runtime state
- [x] Hydrate incident history on boot
- [x] Add operator telemetry snapshots in `data/analytics`
- [x] Expose trend snapshots and eval history through telemetry API
- [x] Add trend/eval history cards to Operator Console
- [x] Keep persistence, telemetry and console history aligned

### M17 - Comparative Analytics & Incident Lifecycle (P2)
- [x] Add comparative telemetry deltas for operator trends
- [x] Add eval history comparisons on top of persisted reports
- [x] Extend incident lifecycle with acknowledge/reopen/resolved history
- [x] Add operator audit trail for safety actions
- [x] Add lifecycle controls and delta cards in Operator Console
- [x] Keep telemetry, safety APIs and console lifecycle views aligned

### M18 - Visual Analytics & Scenario Regression (P2)
- [x] Extend telemetry with scenario-level eval regressions
- [x] Add policy-quality correlation data to operator telemetry
- [x] Add sparkline and mini-bar visual trend widgets in Operator Console
- [x] Add scenario regression and correlation panels in the workspace
- [x] Keep telemetry payload and console visuals aligned
- [x] Verify visual analytics through bundle and runtime checks

### M19 - Comparative Windows & Regression Alerts (P2)
- [x] Add 24h/7d comparative windows against previous periods
- [x] Add scenario trend series from eval history
- [x] Add regression alert emission for scenario drops and policy spikes
- [x] Add reason/source impact panels in the operator workspace
- [x] Keep telemetry payload, alerts and console views aligned
- [x] Verify comparative analytics through runtime and bundle checks

### M20 - Alert Thresholds, Routing & Inbox Control (P2)
- [x] Add alert threshold and routing settings to system config
- [x] Make regression alerts respect configured thresholds and cooldown
- [x] Add archive/snooze controls for operator alerts
- [x] Add regression alert inbox panel in the workspace
- [x] Align terminal notification view with alert routing metadata
- [x] Verify alert routing and inbox controls through runtime checks

### M21 - Alert Lifecycle, Severity & Escalation (P2)
- [x] Add severity tiers and lifecycle metadata for regression alerts
- [x] Add alert acknowledge and manual escalation actions
- [x] Add auto-escalation of critical alerts into safety incidents
- [x] Add operator response metrics for alerts in telemetry
- [x] Add lifecycle and escalation controls to the operator workspace
- [x] Verify alert lifecycle and escalation flow through runtime checks

### M22 - Severity Routing, SLA Automation & Correlation History (P2)
- [x] Add severity-specific routing policy to alert settings
- [x] Add SLA-breach automation into alert escalation flow
- [x] Persist alert-to-incident correlation history in runtime state
- [x] Add operator response trends to telemetry snapshots and console
- [x] Add correlation timeline to the operator workspace
- [x] Verify routing, SLA automation and correlation flow through runtime checks

### M23 - Source/Reason Escalation & Operator Scorecards (P2)
- [x] Add source/reason escalation rules to alert settings
- [x] Enrich regression alerts and correlations with dominant source/reason context
- [x] Add escalation-rule analytics and operator scorecards to telemetry
- [x] Add drill-down correlation context in the operator workspace
- [x] Add scorecard and escalation analytics cards in Operator Console
- [x] Verify source/reason analytics and scorecards through runtime checks

### M24 - Attribution, Deep Links & Guided Response (P2)
- [x] Add operator attribution metadata to alert and incident actions
- [x] Add guided response hints for regression alerts
- [x] Add channel scorecards and operator attribution analytics to telemetry
- [x] Add eval deep links from alert inbox and correlation timeline
- [x] Add source/reason guided response rules in Settings
- [x] Verify attribution, hints and deep-link flows through runtime checks

### M25 - Operator Effectiveness, Playbooks & Deep Drilldown (P2)
- [x] Add per-operator and per-channel effectiveness scoring to telemetry
- [x] Add playbook rules to settings and guided response resolution
- [x] Extend eval payload with scenario, checkpoint and trace references
- [x] Add deep drilldown actions for regressions, evals and checkpoints
- [x] Add operator trend and guided response panels in Operator Console
- [x] Verify effectiveness analytics and playbooks through runtime checks

### M26 - Closed-Loop Remediation & Long-Horizon Effectiveness (P2)
- [x] Add playbook execution tracking and completion outcomes
- [x] Add long-horizon 30d/90d effectiveness summaries to telemetry
- [x] Add closed-loop playbook execution endpoint for alert actions
- [x] Add deeper checkpoint/eval drilldown in alert and correlation panels
- [x] Add playbook effectiveness and long-horizon trend cards in Operator Console
- [x] Verify remediation execution and long-horizon analytics through runtime checks

### M27 - Outcome Scoring & Suggested Paths (P2)
- [x] Add playbook outcome scoring and recommended remediation paths
- [x] Add failing-check summaries and check references into regression alerts
- [x] Add historical effectiveness comparison deltas to telemetry
- [x] Add suggested paths and failing-check drilldown to Operator Console
- [x] Fix checkpoint rollback API to accept `checkpointId` payload
- [x] Verify suggested remediation flow and telemetry deltas through runtime checks

### M28 - Comparative Outcome Intelligence & Execution Chains (P2)
- [x] Add comparative outcome matrix across operator, channel, playbook, severity and source
- [x] Add severity/source history comparisons into telemetry
- [x] Add execution chains to suggested remediation alerts
- [x] Add deeper trace/task drilldown from failing checks and correlations
- [x] Add comparative outcome and history cards in Operator Console
- [x] Verify execution-chain, rollback and comparative analytics through runtime checks

### M29 - Chain-Aware Remediation Intelligence (P2)
- [x] Add reason outcome, history and latency comparisons to telemetry
- [x] Add unified operator/channel outcome comparisons for apples-to-apples scoring
- [x] Enrich execution chain steps with preconditions and outcome signals
- [x] Extend comparative matrix to include reasons and unified outcomes
- [x] Add reason analytics and unified outcome cards to Operator Console
- [x] Verify reason/time analytics and chain-aware remediation through runtime checks

### M30 - Outcome-Driven Remediation Orchestration (P2)
- [x] Add chain outcome comparisons and reason effectiveness windows to telemetry
- [x] Add verify artifact summaries and chain summaries to regression alerts
- [x] Enrich execution chain steps with runtime status for orchestration
- [x] Add chain outcomes and reason effectiveness cards in Operator Console
- [x] Add chain-step execution affordances in regression alert inbox
- [x] Verify playbook-step, acknowledge, rollback and orchestration analytics through runtime checks

### M31 - Automatic Verify Branching & Remediation Time-Series (P2)
- [x] Add automatic verify branching toward fallback or escalation decisions
- [x] Add chain outcome score, verify artifact details and remediation trend telemetry
- [x] Add chain score and verify artifact drilldown to regression alerts
- [x] Add remediation trend and richer chain outcome analytics in Operator Console
- [x] Add runtime chain-step status updates for verify and escalation paths
- [x] Verify verify-branching, playbook-step, acknowledge and rollback through runtime checks

### M32 - Full Auto-Run Chains & Timeline (P2)
- [x] Add full auto-run endpoint for remediation chains
- [x] Add chain timeline and chain duration summaries to regression alerts
- [x] Add per-step duration details and trend duration telemetry
- [x] Add auto-run action, timeline and duration drilldown in Operator Console
- [x] Add chain run identifiers and timeline events for remediation flows
- [x] Verify auto-run, verify branching, telemetry and rollback through runtime checks

### M33 - Resilient Auto-Run & Forensics (P2)
- [x] Add retry/backoff-aware execution policies for remediation chains
- [x] Add richer chain audit trail and per-step attempt summaries to telemetry
- [x] Add time-to-verify and MTTR analytics per reason/source
- [x] Add execution policy controls in Settings for alert remediation
- [x] Add TTV/MTTR and chain audit cards in Operator Console
- [x] Verify auto-run retry, telemetry analytics and rollback through runtime checks

### M34 - Retry Budgets & Granular Policies (P2)
- [x] Add retry budgets, exponential backoff controls and severity policy overrides
- [x] Add attempt-level forensics and retry budget analytics to telemetry
- [x] Add windowed TTV/MTTR comparisons for remediation performance
- [x] Add granular execution policy controls in Settings
- [x] Add retry budget, windowed comparisons and attempt forensics cards in Operator Console
- [x] Verify policy config, auto-run telemetry, build and rollback through runtime checks

### M35 - Attempt Envelopes & Retry Guard Windows (P2)
- [x] Add true attempt envelopes with planned vs actual backoff fields
- [x] Add retry storm guard windows and granular retry guard telemetry
- [x] Add attempt-envelope forensics and per-alert attempt summaries
- [x] Add retry storm controls in Settings and attempt visibility in Operator Console
- [x] Add windowed retry guard context into auto-run execution policy decisions
- [x] Verify attempt envelopes, retry guards, telemetry, build and rollback through runtime checks

### M36 - Scheduled Retries & Policy Attribution (P2)
- [x] Add scheduled retry execution with persisted attempt envelopes
- [x] Add typed attempt outcomes and scheduler visibility to telemetry
- [x] Add policy revision tracking and before/after attribution deltas
- [x] Add scheduler and policy attribution cards in Operator Console
- [x] Add retry scheduler rehydration and policy revision recording on settings sync
- [x] Verify scheduled retries, telemetry attribution, build and rollback through runtime checks

### M37 - Durable Retry Queue & Dimensioned Throttling (P2)
- [x] Add durable retry queue records with lease/state tracking
- [x] Add policy revision field diffs and diff-aware attribution telemetry
- [x] Add throttling buckets per reason/source/step with blockedByDimension
- [x] Add deeper tool/runtime failure taxonomy across attempt forensics
- [x] Add queue, diff and throttling drilldown in Operator Console and Settings
- [x] Verify durable queue, dimension throttling, build and rollback through runtime checks

### M38 - Queue Hardening & Lag Telemetry (P2)
- [x] Add retry queue cancellation and dead-letter requeue flows
- [x] Add precise delay semantics with lateness, skew and recovery delay fields
- [x] Add queue lag, overdue jobs and dead-letter telemetry summaries
- [x] Add policy diff history drilldown for recent revisions
- [x] Add queue hardening and lag/dead-letter cards in Operator Console
- [x] Verify cancellation, requeue, lag telemetry, build and rollback through runtime checks

### M39 - Queue Recovery & Attribution Safety (P2)
- [x] Add lease sweeper and expired job recovery outside restart flow
- [x] Add replay-safe queue maintenance and duplicate suppression
- [x] Add operator dead-letter replay/discard actions in runtime and UI
- [x] Add per-field policy impact attribution summaries
- [x] Add recovery, discard and lag drilldown to Operator Console telemetry
- [x] Verify sweeper, replay safety, replay/discard actions, build and rollback through runtime checks

### M40 - Lease Health, Quarantine & Attribution Windows (P2)
- [x] Add lease heartbeat tracking and stale-lease recovery signals
- [x] Add quarantine workflow for retry jobs and operator triage actions
- [x] Add replay safety audit summaries and queue risk scoring
- [x] Add per-field attribution windows for 24h, 7d and 30d views
- [x] Add quarantine, risk and attribution-window cards in Operator Console
- [x] Verify heartbeat, quarantine, replay audits, build and rollback through runtime checks

### M41 - Queue SLA, Ownership & Confidence (P2)
- [x] Add retry queue SLA alerts on heartbeat/lease risk and high-risk backlog
- [x] Add quarantine ownership, triage status and note history actions
- [x] Add replay lineage summaries and evidence-aware requeue history
- [x] Add field-attribution confidence scoring on top of impact windows
- [x] Add queue SLA inbox, quarantine cases and replay lineage cards in Operator Console
- [x] Verify SLA alerts, triage workflow, lineage telemetry, build and rollback through runtime checks

### M42 - Quarantine Resolution, Owner SLA & Confidence Integrity (P2)
- [x] Add quarantine resolve/reopen lifecycle with explicit state transitions
- [x] Add ownership handoff flow and per-owner SLA summaries
- [x] Add replay lineage graph telemetry and graph drilldown
- [x] Add attribution sample guards and confidence integrity labels
- [x] Add quarantine lifecycle and owner SLA controls in Operator Console
- [x] Verify lifecycle, handoff, owner SLA, lineage graph, build and rollback through runtime checks

### M43 - Quarantine Drilldown, Handoff Breaches & Confidence Calibration (P2)
- [x] Add quarantine MTTR and aging drilldown summaries
- [x] Add handoff breach summaries and owner-response visibility
- [x] Add replay parent-child lineage graph edges and chain counters
- [x] Add confidence calibration with stability and sample-quality scores
- [x] Add MTTR, handoff breach and calibrated confidence cards in Operator Console
- [x] Verify drilldown, breach telemetry, replay chains, build and rollback through runtime checks

### M44 - Quarantine Trends, Owner Escalation Paths & Confidence Suppression (P2)
- [x] Add persisted quarantine trend snapshots and MTTR trend telemetry
- [x] Add owner escalation alerts and handoff escalation visibility
- [x] Add replay path forensics on top of lineage graph
- [x] Add confidence suppression metadata for unstable or low-quality impact windows
- [x] Add MTTR trend, owner alerts and suppression drilldown in Operator Console
- [x] Verify trends, escalation alerts, replay path telemetry, build and rollback through runtime checks

### M45 - Resolution Analytics, Workload Balancing & Governance (P2)
- [x] Add quarantine resolution analytics and reopen-rate summaries
- [x] Add owner workload balancing recommendations and escalation context
- [x] Add lineage root-cause correlation across replay and quarantine paths
- [x] Add confidence governance summaries and quality-band telemetry
- [x] Add balancing, root-cause and governance drilldown in Operator Console
- [x] Verify resolution analytics, workload telemetry, governance signals, build and rollback through runtime checks

### M46 - Snapshot Retention & Auto-Prune (P1)
- [x] Add checkpoint file retention that protects active rollback references
- [x] Add boot-time prune of orphaned snapshot checkpoint files on disk
- [x] Keep checkpoint metadata consistent with retained files after prune
- [x] Execute one-time cleanup of historical checkpoint bloat in `data/snapshots`
- [x] Verify build, restart, pruning results and rollback after cleanup

### M47 - Snapshot Footprint Governance & Manual Prune (P1)
- [x] Add hybrid retention policies for snapshots and checkpoints with count+bytes budgets
- [x] Add snapshot footprint telemetry and manual prune API with dry-run
- [x] Filter snapshot listing to `gai_snapshot_*` only
- [x] Add Snapshot Footprint card and manual prune controls in Operator Console
- [x] Verify build, restart, dry-run/prune behavior and rollback after retention changes

### M48 - Snapshot Cost Attribution & Footprint Guardrails (P1)
- [x] Add snapshot/checkpoint disk attribution by reason and source
- [x] Add footprint threshold alerts and prune recommendations
- [x] Add retention policy controls in Settings
- [x] Add attribution, alerts and recommendations to Operator Console
- [x] Verify build, restart, guardrail alerts, settings save and rollback after M48

### M49 - Scoped Prune, Owner Budgets & Auto-Prune Policy (P1)
- [x] Add scoped checkpoint prune by reason, source and owner filters
- [x] Add owner-aware budgets and snapshot growth trend telemetry
- [x] Add auto-prune policy controls and owner budgets in Settings
- [x] Add growth, owner budget and scoped prune controls in Operator Console
- [x] Verify build, restart, scoped prune, auto-prune and rollback after M49

### M50 - Forecast, Audit Trail & Prune Profiles (P1)
- [x] Add threshold forecast telemetry for snapshot footprint budgets
- [x] Add prune audit trail for dry-run, manual prune and auto-prune
- [x] Add snapshot/checkpoint policy profiles in Settings
- [x] Add forecast and audit visibility in Operator Console
- [x] Verify build, restart, forecast, audit trail, owner-enforced prune and rollback after M50

### M51 - Per-Owner Forecast, Prune History & Recovery Priorities (P1)
- [x] Add per-owner forecast telemetry for owner budget exhaustion
- [x] Add prune history API and bounded prune via auto-prune byte cap per run
- [x] Add recovery priority recommendations across risk, owner balance, quarantine and replay
- [x] Add owner forecast, prune history and cap controls in Operator Console and Settings
- [x] Verify build, restart, bounded prune, history API, forecast accuracy and rollback after M51

### M52 - Bucket Forecast, Owner Caps & Recovery Targets (P1)
- [x] Add bucket-level forecast and days-to-threshold telemetry
- [x] Add owner-specific prune caps alongside global auto-prune cap
- [x] Add recovery recommendations with prune targets and recoverable bytes
- [x] Add owner-cap authoring plus bucket/recovery visibility in Operator Console and Settings
- [x] Verify build, restart, owner-capped prune, history filters, forecast and rollback after M52

### M53 - Prune History Console, Bucket ETA & Auto-Prune Ranking (P1)
- [x] Add per-bucket ETA telemetry and best-next-prune action selection
- [x] Add prune owner ranking for owner-enforced auto-prune choice
- [x] Add detailed prune history panel with owner/mode filters in Operator Console
- [x] Add best-action and ranking visibility alongside recovery recommendations
- [x] Verify build, restart, history filters, ranked prune selection and rollback after M53

### M54 - Decision Cockpit Drilldowns & Heatmaps (P1)
- [x] Add decision cockpit widgets for owner ETA, bucket ETA and best-action preview
- [x] Add prune history drilldown with selected-run impact details
- [x] Add policy heatmap based on field impact windows
- [x] Add best-action/recovery/ranking visibility in the Operator Console
- [x] Verify build, restart, decision cockpit markers, preview action and rollback after M54

### M55 - Runtime Scaffold & Adapter Registry (P1)
- [x] Add missing runtime scaffold modules for command, stream, task, autonomy and state
- [x] Register no-behavior-change adapters from `server.js` into runtime descriptors
- [x] Expose runtime readiness descriptors in autonomy telemetry
- [x] Keep legacy ownership of execution logic while preparing PR1 architecture path
- [x] Verify build, restart, runtime descriptor readiness and no-regression behavior after M55

### M56 - ToolRuntime Helper Extraction & Parity Hooks (P1)
- [x] Extract shared tool-plan parsing into `services/runtime/toolRuntime.js`
- [x] Extract tool-state bootstrap helpers into shared runtime
- [x] Reuse shared single-call normalization in legacy executor
- [x] Keep `server.js` execution ownership while thinning wrappers
- [x] Verify build, restart, parser/helper parity and no-regression behavior after M56

### M57 - Canonical Plan Envelope & Runtime Readiness Hooks (P1)
- [x] Add canonical tool-plan execution envelope in `services/runtime/toolRuntime.js`
- [x] Move `executeTools` bootstrap to shared envelope creation without changing ownership
- [x] Extend shared tool runtime descriptor with helper/parity readiness flags
- [x] Keep `server.js` as canonical executor while shrinking prelude logic
- [x] Verify build, restart, envelope parity and runtime descriptor readiness after M57

### M58 - Tool Trace Prelude Extraction & Parity Metrics (P1)
- [x] Extract shared tool trace prelude envelope into `services/runtime/toolRuntime.js`
- [x] Extract shared tool execution stats accounting into runtime helpers
- [x] Keep `server.js` as canonical executor while shrinking trace/accounting prelude
- [x] Extend runtime descriptor with trace/accounting readiness flags
- [x] Verify build, restart, trace/helper parity and runtime readiness after M58

### M59 - Tool Completion Trace Extraction & Result Hooks (P1)
- [x] Extract shared tool completion trace envelope into `services/runtime/toolRuntime.js`
- [x] Reuse shared completion helper for success/failure trace finalization in `server.js`
- [x] Extend runtime descriptor with completion-trace readiness flag
- [x] Keep `server.js` as canonical executor while shrinking result/finalization prelude
- [x] Verify build, restart, completion-trace parity and runtime readiness after M59

### M60 - Permission Gate & Sequence Checkpoint Planning Extraction (P1)
- [x] Extract shared permission gate resolution into `services/runtime/toolRuntime.js`
- [x] Extract shared sequence-checkpoint planning into runtime helpers
- [x] Reuse shared permission/checkpoint helpers in `server.js` without moving executor ownership
- [x] Extend runtime descriptor with permission/checkpoint readiness flags
- [x] Verify build, restart, permission/checkpoint parity and runtime readiness after M60

### M61 - Post-Exec Verification & Persist Planning Extraction (P1)
- [x] Extract shared post-exec verification/persist planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared post-exec plan in `server.js` for auto-verification and final save
- [x] Extend runtime descriptor with post-exec readiness flag
- [x] Keep `server.js` as canonical executor while shrinking postlude orchestration
- [x] Verify build, restart, post-exec parity and runtime readiness after M61

### M62 - Preflight & Autonomy Block Planning Extraction (P1)
- [x] Extract shared preflight outcome planning into `services/runtime/toolRuntime.js`
- [x] Extract shared autonomy tool-health/block planning into runtime helpers
- [x] Reuse shared preflight/block helpers in `server.js` without moving executor ownership
- [x] Extend runtime descriptor with preflight/autonomy readiness flags
- [x] Verify build, restart, preflight parity and runtime readiness after M62

### M63 - Tool Logging & Block Prelude Extraction (P1)
- [x] Extract shared tool logging/dispatch prelude planning into `services/runtime/toolRuntime.js`
- [x] Extract shared repeated-failure block planning into runtime helpers
- [x] Reuse shared logging/block helpers in `server.js` without moving executor ownership
- [x] Extend runtime descriptor with logging/block readiness flags
- [x] Verify build, restart, logging/block parity and runtime readiness after M63

### M64 - Shell Dispatch Prelude Extraction (P1)
- [x] Extract shared shell dispatch prelude normalization into `services/runtime/toolRuntime.js`
- [x] Reuse shared shell prelude helper in `server.js` before SHELL execution
- [x] Extend runtime descriptor with shell dispatch readiness flag
- [x] Keep `server.js` as canonical executor while shrinking SHELL pre-dispatch logic
- [x] Verify build, restart, shell prelude parity and runtime readiness after M64

### M65 - Autonomy SHELL Guard Planning Extraction (P1)
- [x] Extract shared autonomy SHELL guard planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared shell guard helper in `server.js` without moving executor ownership
- [x] Extend runtime descriptor with autonomy-shell-guard readiness flag
- [x] Keep `server.js` as canonical executor while shrinking autonomy SHELL guard logic
- [x] Verify build, restart, shell guard parity and runtime readiness after M65

### M66 - SHELL Security Plan Extraction (P1)
- [x] Extract shared SHELL safety/security planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared security helper in `server.js` before filesystem-sensitive checks
- [x] Extend runtime descriptor with shell-security readiness flag
- [x] Keep `server.js` as canonical executor while shrinking SHELL security gate logic
- [x] Verify build, restart, shell security parity and runtime readiness after M66

### M67 - SHELL Smart Guard & Fixup Extraction (P1)
- [x] Extract shared SHELL smart-guard/fixup planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared smart-guard helper in `server.js` before SHELL execution streaming
- [x] Extend runtime descriptor with shell-smart-guard readiness flag
- [x] Keep `server.js` as canonical executor while shrinking SHELL fixup/hint logic
- [x] Verify build, restart, shell smart-guard parity and runtime readiness after M67

### M68 - SHELL Cache Prelude Extraction (P1)
- [x] Extract shared SHELL cache prelude planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared cache helper in `server.js` before SHELL execution streaming
- [x] Extend runtime descriptor with shell-cache readiness flag
- [x] Keep `server.js` as canonical executor while shrinking SHELL cache/memory prelude
- [x] Verify build, restart, shell cache parity and runtime readiness after M68

### M69 - SHELL Stream Flush Orchestration Extraction (P1)
- [x] Extract shared SHELL stream/flush coordination into `services/runtime/toolRuntime.js`
- [x] Reuse shared stream coordinator in `server.js` during SHELL execution streaming
- [x] Extend runtime descriptor with shell-stream readiness flag
- [x] Keep `server.js` as canonical executor while shrinking SHELL streaming/flush logic
- [x] Verify build, restart, shell stream parity and runtime readiness after M69

### M70 - SHELL Result Post-Run Extraction (P1)
- [x] Extract shared SHELL result/post-run planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared result helper in `server.js` for cache, memory and failure/no-match handling
- [x] Extend runtime descriptor with shell-result readiness flag
- [x] Keep `server.js` as canonical executor while shrinking SHELL post-run logic
- [x] Verify build, restart, shell result parity and runtime readiness after M70

### M71 - Tool Loop Budget & Deadline Planning Extraction (P1)
- [x] Extract shared tool loop budget/deadline planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared loop gate helper in `server.js` before each tool iteration
- [x] Extend runtime descriptor with tool-loop readiness flag
- [x] Keep `server.js` as canonical executor while shrinking loop budget/deadline logic
- [x] Verify build, restart, loop gate parity and runtime readiness after M71

### M72 - Tool Args Cleanup Extraction (P1)
- [x] Extract shared cleanup for concatenated timestamps/tool token noise into `services/runtime/toolRuntime.js`
- [x] Reuse shared args cleanup helper in `server.js` before tool normalization aliases
- [x] Extend runtime descriptor with args-cleanup readiness flag
- [x] Keep `server.js` as canonical executor while shrinking per-tool prelude cleanup logic
- [x] Verify build, restart, cleanup parity and runtime readiness after M72

### M73 - Tool Alias & Normalization Extraction (P1)
- [x] Extract shared tool alias/name normalization into `services/runtime/toolRuntime.js`
- [x] Reuse shared normalization helper in `server.js` before mutate/file-read guards
- [x] Extend runtime descriptor with tool-normalization readiness flag
- [x] Keep `server.js` as canonical executor while shrinking per-tool alias handling
- [x] Verify build, restart, normalization parity and runtime readiness after M73

### M74 - Tool Mutation Flag Extraction (P1)
- [x] Extract shared mutating-action flag planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared mutation helper in `server.js` before autonomy/file-read guards
- [x] Extend runtime descriptor with tool-mutation readiness flag
- [x] Keep `server.js` as canonical executor while shrinking per-tool mutation flag logic
- [x] Verify build, restart, mutation parity and runtime readiness after M74

### M75 - Autonomy Repeat Tool Planning Extraction (P1)
- [x] Extract shared autonomy repeated-tool signature planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared repeat-signature helper in `server.js` before research-budget guards
- [x] Extend runtime descriptor with autonomy-repeat readiness flag
- [x] Keep `server.js` as canonical executor while shrinking repeated FILE_READ block logic
- [x] Verify build, restart, repeat-signature parity and runtime readiness after M75

### M76 - Research Budget Planning Extraction (P1)
- [x] Extract shared research-budget block planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared research-budget helper in `server.js` before execution-log prelude
- [x] Extend runtime descriptor with research-budget readiness flag
- [x] Keep `server.js` as canonical executor while shrinking WEB research-only guard logic
- [x] Verify build, restart, research-budget parity and runtime readiness after M76

### M77 - Tool Execution Prelude Extraction (P1)
- [x] Extract shared tool execution prelude planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared prelude helper in `server.js` for attempt naming, args cleanup, normalization and mutation flags
- [x] Extend runtime descriptor with tool-prelude readiness flag
- [x] Keep `server.js` as canonical executor while shrinking per-tool prelude setup logic
- [x] Verify build, restart, prelude parity and runtime readiness after M77

### M78 - Autonomy Tool Guard Prelude Extraction (P1)
- [x] Extract shared autonomy guard prelude planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared autonomy guard helper in `server.js` for repeat-signature and research-budget plans
- [x] Extend runtime descriptor with autonomy-guard readiness flag
- [x] Keep `server.js` as canonical executor while shrinking autonomy prelude composition logic
- [x] Verify build, restart, autonomy-guard parity and runtime readiness after M78

### M79 - Tool Pre-Exec Guard Composite Extraction (P1)
- [x] Extract shared composite preflight+policy pre-exec planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared composite helper in `server.js` for preflight outcome and autonomy health gate
- [x] Extend runtime descriptor with pre-exec-guard readiness flag
- [x] Keep `server.js` as canonical executor while shrinking preflight/policy composition logic
- [x] Verify build, restart, composite parity and runtime readiness after M79

### M80 - Tool Permission & Dispatch Composite Extraction (P1)
- [x] Extract shared permission/pre-dispatch composite planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared composite helper in `server.js` for permission deny/approve handling and block-plan reuse
- [x] Extend runtime descriptor with permission-dispatch readiness flag
- [x] Keep `server.js` as canonical executor while shrinking permission/block composition logic
- [x] Verify build, restart, permission/disptach parity and runtime readiness after M80

### M81 - Tool Trace Bootstrap Composite Extraction (P1)
- [x] Extract shared trace/bootstrap composite planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared trace/bootstrap helper in `server.js` for trace envelope bootstrap and execution stats
- [x] Extend runtime descriptor with trace-bootstrap readiness flag
- [x] Keep `server.js` as canonical executor while shrinking trace bootstrap composition logic
- [x] Verify build, restart, trace/bootstrap parity and runtime readiness after M81

### M82 - Tool Console Frame Extraction (P1)
- [x] Extract shared console frame/render planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared console-frame helper in `server.js` for GAI tool frame rendering before dispatch
- [x] Extend runtime descriptor with console-frame readiness flag
- [x] Keep `server.js` as canonical executor while shrinking console render composition logic
- [x] Verify build, restart, console-frame parity and runtime readiness after M82

### M83 - Tool Completion Envelope Extraction (P1)
- [x] Extract shared post-dispatch completion envelope planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared completion helper in `server.js` for success/failure trace completion updates
- [x] Extend runtime descriptor with completion-envelope readiness flag
- [x] Keep `server.js` as canonical executor while shrinking post-dispatch completion composition logic
- [x] Verify build, restart, completion-envelope parity and runtime readiness after M83

### M84 - Tool Stats Update Extraction (P1)
- [x] Extract shared success/failure/attempt stats update planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared stats helper in `server.js` for attempt, success and failure counters
- [x] Extend runtime descriptor with tool-stats readiness flag
- [x] Keep `server.js` as canonical executor while shrinking stats mutation logic
- [x] Verify build, restart, stats parity and runtime readiness after M84

### M85 - Tool Outcome Cache/Memory Extraction (P1)
- [x] Extract shared outcome/cache-memory planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared outcome helper in `server.js` for FILE_READ, WEB_SEARCH and WEB_READ success paths
- [x] Extend runtime descriptor with tool-outcome readiness flag
- [x] Keep `server.js` as canonical executor while shrinking cache/memory outcome composition logic
- [x] Verify build, restart, outcome parity and runtime readiness after M85

### M86 - File Read Result Composite Extraction (P1)
- [x] Extract shared file-read success/result planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared file-read result helper in `server.js` for directory, cache and file paths
- [x] Extend runtime descriptor with file-read-result readiness flag
- [x] Keep `server.js` as canonical executor while shrinking FILE_READ success composition logic
- [x] Verify build, restart, file-read parity and runtime readiness after M86

### M87 - Web Search Result Composite Extraction (P1)
- [x] Extract shared web-search result planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared web-search result helper in `server.js` for cache and live result paths
- [x] Extend runtime descriptor with web-search-result readiness flag
- [x] Keep `server.js` as canonical executor while shrinking WEB_SEARCH success composition logic
- [x] Verify build, restart, web-search parity and runtime readiness after M87

### M88 - Web Read Result Composite Extraction (P1)
- [x] Extract shared web-read result planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared web-read result helper in `server.js` for cache and live result paths
- [x] Extend runtime descriptor with web-read-result readiness flag
- [x] Keep `server.js` as canonical executor while shrinking WEB_READ success composition logic
- [x] Verify build, restart, web-read parity and runtime readiness after M88

### M89 - File Write Payload Planning Extraction (P1)
- [x] Extract shared FILE_WRITE payload/path planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared file-write planning helper in `server.js` for payload, path and directory-target inference
- [x] Extend runtime descriptor with file-write readiness flag
- [x] Keep `server.js` as canonical executor while shrinking FILE_WRITE pre-write planning logic
- [x] Verify build, restart, file-write parity and runtime readiness after M89

### M90 - File Write Content Prelude Extraction (P1)
- [x] Extract shared FILE_WRITE content conversion/result prelude into `services/runtime/toolRuntime.js`
- [x] Reuse shared file-write content helper in `server.js` for missing-content, conversion, validation and success message handling
- [x] Extend runtime descriptor with file-write-content readiness flag
- [x] Keep `server.js` as canonical executor while shrinking FILE_WRITE content/result preparation logic
- [x] Verify build, restart, file-write-result parity and runtime readiness after M90

### M91 - File Replace Planning Extraction (P1)
- [x] Extract shared FILE_REPLACE payload/path planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared file-replace planning helper in `server.js` for payload, path, existence and directory checks
- [x] Extend runtime descriptor with file-replace readiness flag
- [x] Keep `server.js` as canonical executor while shrinking FILE_REPLACE pre-replace planning logic
- [x] Verify build, restart, file-replace parity and runtime readiness after M91

### M92 - File Replace Result Extraction (P1)
- [x] Extract shared FILE_REPLACE result/success planning into `services/runtime/toolRuntime.js`
- [x] Reuse shared file-replace result helper in `server.js` for direct replace, whitespace-normalized replace and not-found errors
- [x] Extend runtime descriptor with file-replace-result readiness flag
- [x] Keep `server.js` as canonical executor while shrinking FILE_REPLACE replace-result logic
- [x] Verify build, restart, file-replace-result parity and runtime readiness after M92

### M93 - Task Action Prelude/Create Extraction (P1)
- [x] Extract shared TASK_ACTION prelude and create-planning helpers into `services/runtime/toolRuntime.js`
- [x] Reuse shared task-action helpers in `server.js` for payload parsing, autonomy error handling and create gating
- [x] Extend runtime descriptor with task-action readiness flags
- [x] Keep `server.js` as canonical executor while shrinking TASK_ACTION prelude/create logic
- [x] Verify build, restart, task-action parity and runtime readiness after M93

### M94 - Task Action Target Resolution Extraction (P1)
- [x] Extract shared TASK_ACTION update target-resolution helper into `services/runtime/toolRuntime.js`
- [x] Reuse shared target-resolution helper in `server.js` for task-id fallback and subtask owner lookup
- [x] Extend runtime descriptor with task-action-target readiness flag
- [x] Keep `server.js` as canonical executor while shrinking TASK_ACTION update target-resolution logic
- [x] Verify build, restart, task-action-target parity and runtime readiness after M94

### M95 - Task Action Subtask Toggle Extraction (P1)
- [x] Extract shared TASK_ACTION subtask-toggle composite into `services/runtime/toolRuntime.js`
- [x] Reuse shared subtask-toggle helper in `server.js` for task/subtask resolution, autonomy error handling and progress recompute
- [x] Extend runtime descriptor with task-action-subtask readiness flag
- [x] Keep `server.js` as canonical executor while shrinking TASK_ACTION toggle_subtask logic
- [x] Verify build, restart, subtask-toggle parity and runtime readiness after M95

### M96 - Task Action Evidence Prelude Extraction (P1)
- [x] Extract shared TASK_ACTION evidence/verification prelude into `services/runtime/toolRuntime.js`
- [x] Reuse shared evidence helper in `server.js` for explicit/derived evidence, subtasks evidence and verification result prelude
- [x] Extend runtime descriptor with task-action-evidence readiness flag
- [x] Keep `server.js` as canonical executor while shrinking TASK_ACTION update completion prelude logic
- [x] Verify build, restart, evidence/verification parity and runtime readiness after M96

### M97 - Task Action Quality Gate Extraction (P1)
- [x] Extract shared TASK_ACTION quality-gate decision helper into `services/runtime/toolRuntime.js`
- [x] Reuse shared quality-gate helper in `server.js` for finish-mode blocking, real-action blocking and bypass/auto-audit decisions
- [x] Extend runtime descriptor with task-action-quality-gate readiness flag
- [x] Keep `server.js` as canonical executor while shrinking TASK_ACTION completion gate logic
- [x] Verify build, restart, quality-gate parity and runtime readiness after M97

### M98 - Task Action Mutation/Status Extraction (P1)
- [x] Extract shared TASK_ACTION update/complete mutation-status helper into `services/runtime/toolRuntime.js`
- [x] Reuse shared mutation/status helper in `server.js` for field updates, progress gating, evidence log appends and completion status application
- [x] Extend runtime descriptor with task-action-mutation readiness flag
- [x] Keep `server.js` as canonical executor while shrinking TASK_ACTION update/complete mutation logic
- [x] Verify build, restart, mutation/status parity and runtime readiness after M98

### M99 - Task Action Finalization Extraction (P1)
- [x] Extract shared TASK_ACTION completion/finalization helper into `services/runtime/toolRuntime.js`
- [x] Reuse shared finalization helper in `server.js` for trace-event planning, breakdown trigger, cache clearing and Telegram/log decisions
- [x] Extend runtime descriptor with task-action-finalization readiness flag
- [x] Keep `server.js` as canonical executor while shrinking TASK_ACTION post-update finalization logic
- [x] Verify build, restart, finalization parity and runtime readiness after M99

### M100 - PR2 TASK_ACTION Residual Sweep (P1)
- [x] Extract shared TASK_ACTION residual helpers into `services/runtime/toolRuntime.js` for create-result, subtask-owner update and autonomy error policy
- [x] Reuse shared residual helpers in `server.js` for create materialization, subtask owner mutation and remaining autonomy error branches
- [x] Extend runtime descriptor with residual TASK_ACTION readiness flags
- [x] Keep `server.js` as canonical executor while shrinking remaining inline TASK_ACTION scaffolding
- [x] Verify build, restart, parity sweep and runtime readiness after M100

### M101 - AgentRouter Shared Runtime First Cut (P1)
- [x] Map `AgentRouter` execution/parsing path against shared `toolRuntime` and choose low-risk PR3 entry point
- [x] Reuse shared `toolRuntime` parsing in `AgentRouter` with legacy JSON `tool_call` compatibility preserved
- [x] Support bundled parsed tool calls in `runAgent` while keeping `server.js` as canonical executor owner
- [x] Keep PR3 incremental: no routing-policy rewrite, only parser/execution-path adoption first
- [x] Verify build, restart, parser parity, runtime readiness and no new diagnostics after M101

### M102 - AgentRouter Canonical Tool Plan Cut (P1)
- [x] Add shared tool-plan execution summary path for `AgentRouter` and standalone fallback registration in `toolExecutor`
- [x] Reuse shared `executeToolPlanViaRuntime` from `AgentRouter` when bundled tool plans are detected
- [x] Preserve single-tool and legacy `tool_call` compatibility while enabling canonical multi-tool plan execution
- [x] Keep PR3 incremental: canonical plan execution first, without routing-policy rewrite
- [x] Verify build, restart, canonical execution parity, runtime readiness and no new diagnostics after M102

### M103 - AgentRouter Protocol Alignment Cut (P1)
- [x] Align `AgentRouter` prompt protocol with canonical shared-runtime tool-plan syntax while keeping legacy compatibility
- [x] Reuse shared-oriented follow-up prompts and fact-check fallback emission in canonical plan form
- [x] Centralize final response cleanup for canonical and legacy tool protocol artifacts
- [x] Keep PR3 incremental: reduce protocol/legacy branching without removing compatibility fallback yet
- [x] Verify build, restart, protocol parity, runtime readiness and no new diagnostics after M103

### M104 - AgentRouter Runtime-Only Hard Cut (P1)
- [x] Remove legacy executor fallback from `AgentRouter` execution path and require shared runtime readiness explicitly
- [x] Reuse shared `executeToolCallViaRuntime` and `executeToolPlanViaRuntime` as the only execution path for agent tools
- [x] Keep parser compatibility, but switch execution to fail-fast when shared runtime capabilities are unavailable
- [x] Keep PR3 focused: execution hard-cut first, no routing-policy rewrite yet
- [x] Verify build, restart, runtime-only parity, runtime readiness and no new diagnostics after M104

### M105 - AgentRouter Parser Consolidation Sweep (P1)
- [x] Extend shared `parseToolPlanText` to absorb nested/fenced legacy `tool_call` compatibility
- [x] Remove local legacy parser branch from `AgentRouter` and rely on shared `parseToolPlanViaRuntime`
- [x] Keep legacy compatibility through shared runtime while eliminating parser branching in `AgentRouter`
- [x] Run PR3 parity sweep and confirm `AgentRouter` is switched to shared `toolRuntime`
- [x] Verify build, restart, parser parity, runtime readiness and no new diagnostics after M105

### M106 - Routing Metadata Contract First Cut (P1)
- [x] Add shared routing-decision helper with `taskIntentScore`, `routingReason`, `interactionMode` and `responseOrigin`
- [x] Reuse shared routing decision in server routing enforcement points and fix router history to use chat `text`
- [x] Persist routing metadata in chat messages for agent-routed replies without changing UX flow
- [x] Keep PR4 incremental: metadata contract formalization first, no prompt/routing-policy rewrite yet
- [x] Verify build, restart, routing metadata parity, runtime readiness and no new diagnostics after M106

### M107 - Routing Metadata Trace/UI Propagation (P1)
- [x] Propagate routing metadata through trace normalization and emit routing-decision trace events for agent-routed replies
- [x] Reuse routing metadata in Terminal stream state and render passive score/reason badges in Terminal and Task trace UI
- [x] Keep PR4 incremental: improve observability and passive enforcement signals without changing routing policy
- [x] Verify build, restart, trace/UI metadata parity, runtime readiness and no new diagnostics after M107

### M108 - Routing Metadata Enforcement Guards (P1)
- [x] Add shared routing-metadata normalization/anomaly helper and reuse it in chat, trace and tool-runtime sinks
- [x] Remove silent misclassification defaults in critical sinks and emit anomaly trace signals instead of masking invalid metadata
- [x] Align thought/stream metadata fallbacks with actual autonomy vs live-chat context
- [x] Keep PR4 incremental: stricter enforcement and anomaly visibility without changing task-intent heuristic yet
- [x] Verify build, restart, routing enforcement parity, runtime readiness and no new diagnostics after M108

### M109 - PR4 Contract Closure Sweep (P1)
- [x] Align `ExecutionTraceEvent` type contract with emitted PR4 routing events and warning status
- [x] Confirm PR4 metadata/enforcement implementation is end-to-end consistent across runtime, trace and UI
- [x] Close PR4 in tracker after final parity sweep
- [x] Verify build, restart, PR4 parity, runtime readiness and no new diagnostics after M109

### M110 - Task Contract UI First Cut (P1)
- [x] Add shared task-contract rendering panel for schema-v2 fields and completion-readiness summary
- [x] Reuse shared task-contract panel in `TaskManager` and `CodeStudio` to reduce inconsistent task schema rendering
- [x] Keep PR5 incremental: UI rendering first, no schema/runtime mutation changes yet
- [x] Verify build, restart, task-contract rendering parity, runtime readiness and no new diagnostics after M110

### M111 - Terminal Task Contract Alignment (P1)
- [x] Reuse shared `TaskContractPanel` in `TerminalApp` active task context for schema-v2 visibility
- [x] Keep Terminal task context aligned with `TaskManager` and `CodeStudio` without changing runtime/schema behavior
- [x] Keep PR5 incremental: expand shared rendering coverage first, no task mutation changes yet
- [x] Verify build, restart, Terminal contract parity, runtime readiness and no new diagnostics after M111

### M112 - PR5 Closure and Plan Sync Sweep (P1)
- [x] Confirm shared task-contract rendering is aligned across `TaskManager`, `CodeStudio` and `TerminalApp`
- [x] Sync PR numbering/scope in masterplan with the current implementation tracker
- [x] Close PR5 in tracker after final parity sweep
- [x] Verify build, restart, PR5 parity, runtime readiness and no new diagnostics after M112

### M113 - Verification Runtime Contract First Cut (P1)
- [x] Add formal verification runtime descriptor/registration layer for completion validation and auto verification
- [x] Reuse verification runtime through `taskRuntime` delegation and post-exec auto verification path
- [x] Expose verification runtime readiness in telemetry/runtime descriptors without changing verification behavior
- [x] Verify build, restart, verification parity, runtime readiness and no new diagnostics after M113

### M114 - Completion Validation Runtime Alignment (P1)
- [x] Route server-side completion validation through `taskRuntime` runtime gate instead of local predicate ownership
- [x] Keep verification policy in `verificationRuntime`, but centralize server call-sites on runtime validation entry point
- [x] Keep PR6 incremental: validation ownership hard-cut first, no stricter evidence semantics yet
- [x] Verify build, restart, validation parity, runtime readiness and no new diagnostics after M114

### M115 - PR6 Closure Sweep (P1)
- [x] Confirm verify-before-complete enforcement is aligned across `verificationRuntime`, `taskRuntime`, `server.js` and task mutation flow
- [x] Confirm verification artifacts/readiness are visible end-to-end in shared task-contract UI
- [x] Close PR6 in tracker after final parity sweep
- [x] Verify build, restart, PR6 parity, runtime readiness and no new diagnostics after M115

### M116 - TaskManager Rollback Entry Point (P1)
- [x] Add rollback action in `TaskManager` trace UI using existing `/api/checkpoint/rollback` endpoint
- [x] Improve PR7 UI parity between `CodeStudio` and `TaskManager` without changing checkpoint runtime semantics
- [x] Keep PR7 incremental: UI entry-point parity first, no rollback target resolver yet
- [x] Verify build, restart, rollback UI parity, runtime readiness and no new diagnostics after M116

### M117 - Rollback Target Resolver and PR7 Closure (P1)
- [x] Add rollback target resolution for `task_checkpoint`, `previous_stable_checkpoint` and `pre_run_checkpoint`
- [x] Reuse rollback target resolver in `/api/checkpoint/rollback` while preserving explicit checkpoint-id rollback
- [x] Sync stale `rollbackCheckpointId` tracker status and close PR7 after parity sweep
- [x] Verify build, restart, PR7 parity, runtime readiness and no new diagnostics after M117

### M118 - Terminal Execution Trace Rail First Cut (P1)
- [x] Reuse `traceEvents` in `TerminalApp` and add a read-only execution trace rail for the active task/current context
- [x] Improve PR8 trace visibility in Terminal without changing trace runtime or server event emission
- [x] Keep PR8 incremental: Terminal trace-first read path first, no shared rail refactor yet
- [x] Verify build, restart, trace parity, runtime readiness and no new diagnostics after M118

### M119 - Shared Execution Trace Event Renderer (P1)
- [x] Add shared trace-event renderer and small extraction helpers for artifacts/checkpoints/status badges
- [x] Reuse shared trace-event renderer in `TerminalApp`, `TaskManager` and trace items in `CodeStudio`
- [x] Keep PR8 incremental: share event-card presentation first, app-specific filters/actions stay local
- [x] Verify build, restart, shared trace parity, runtime readiness and no new diagnostics after M119

### M120 - PR8 Closure Sweep (P1)
- [x] Remove remaining fragmented `Runs` panel from Terminal activity sidebar so trace rail becomes the primary execution history view
- [x] Confirm shared trace renderer plus Terminal/TaskManager/CodeStudio coverage satisfies Execution Trace v1 consolidation goal
- [x] Close PR8 in tracker after final parity sweep
- [x] Verify build, restart, PR8 parity, runtime readiness and no new diagnostics after M120

### M121 - Unified Operator Polling Store First Cut (P1)
- [x] Add shared UI runtime store for operator telemetry, Ollama trace and safety status
- [x] Reuse shared operator polling store in `TaskManager` and `CodeStudio` instead of separate local polling loops
- [x] Keep PR9 incremental: unify operator polling/state first, no broader chat/task store rewrite yet
- [x] Verify build, restart, store parity, runtime readiness and no new diagnostics after M121

### M122 - Shared Task UI Selectors Layer (P1)
- [x] Add shared pure selectors for task sorting/default selection, trace grouping, checkpoint grouping and task-level workspace/notification derivation
- [x] Reuse shared task UI selectors in `TaskManager` and `CodeStudio` to reduce duplicate view-model assembly
- [x] Keep PR9 incremental: derived selector consolidation first, no broader store shape rewrite yet
- [x] Verify build, restart, selector parity, runtime readiness and no new diagnostics after M122

### M123 - PR9 Closure Sweep (P1)
- [x] Add shared runtime-store refresh path for safety/telemetry follow-up actions instead of local state writes in `CodeStudio`
- [x] Remove remaining local store-drift call-sites after M121 so operator actions refresh the shared runtime store
- [x] Close PR9 in tracker after final parity sweep
- [x] Verify build, restart, PR9 parity, runtime readiness and no new diagnostics after M123

### M124 - Semantic Task Lessons Retrieval First Cut (P1)
- [x] Index task-completion lessons into vector memory with task-scoped metadata
- [x] Extend relevant-lesson retrieval with semantic task-lesson search plus lexical fallback and dedupe
- [x] Keep PR10 incremental: improve task lesson retrieval first, no usefulness feedback-loop rewrite yet
- [x] Verify build, restart, memory parity, runtime readiness and no new diagnostics after M124

### M125 - Lesson Reuse Attribution and Outcome Feedback (P1)
- [x] Persist retrieved lesson refs on tasks so operational memory reuse can be attributed to later task outcomes
- [x] Update lesson usefulness/outcome metadata when reused lessons help or fail tasks, with shared GAI Memory visibility
- [x] Keep PR10 incremental: outcome feedback loop first, no full memory eval harness rewrite yet
- [x] Verify build, restart, memory parity, runtime readiness and no new diagnostics after M125

### M126 - PR10 Closure Sweep (P1)
- [x] Expose task-level memory attribution in shared task contract UI so reused lessons are visible on the task itself
- [x] Confirm lesson indexing, semantic retrieval, outcome feedback and task/UI attribution together satisfy operational memory scope
- [x] Close PR10 in tracker after final parity sweep
- [x] Verify build, restart, PR10 parity, runtime readiness and no new diagnostics after M126

### M127 - Structural Runtime Eval Selectors First Cut (P1)
- [x] Extend eval harness with structural `taskSelector` matching so scenarios can target runtime state instead of historical task titles
- [x] Add `baseline-runtime-core.json` and runtime-core npm script as a low-risk structural regression suite
- [x] Keep PR11 incremental: selector contract first, no full live-runtime eval rewrite yet
- [x] Verify build, restart, eval parity, runtime readiness and no new diagnostics after M127

### M128 - Canonical Eval Core Cutover (P1)
- [x] Cut over canonical `baseline-core.json` to structural runtime selectors instead of historical task-title matching
- [x] Add suite-specific latest eval reports and align eval docs around structural baseline-core as the canonical gate
- [x] Close PR11 in tracker after parity sweep with passing canonical `evals:core` and `evals:runtime-core`
- [x] Verify build, restart, eval parity, runtime readiness and no new diagnostics after M128

### M129 - Builder Workspace Data Contract Eval First Cut (P1)
- [x] Extend eval harness with builder-workspace structural checks for task contract, rollback readiness, subtasks and memory attribution
- [x] Add `baseline-builder-workspace.json`, dedicated fixture and npm script for low-risk PR12 regression coverage
- [x] Keep PR12 incremental: data-contract regression gate first, no builder runtime/UI refactor yet
- [x] Verify build, restart, builder eval parity, runtime readiness and no new diagnostics after M129

### M130 - PR12 Closure Sweep (P1)
- [x] Confirm Builder Workspace v1 surface covers goal/plan, files/diff, verify/evidence, rollback and observability from one workspace
- [x] Confirm shared task contract UI and builder workspace regression suite satisfy PR12 acceptance without further runtime changes
- [x] Close PR12 in tracker after final parity sweep
- [x] Verify builder-workspace gate, runtime readiness and no new diagnostics after M130

### M131 - Canonical CSS and Audit Contract Sweep (P2)
- [x] Canonicalize audit expectations around `css/corrected_styles.css` and compare configured aliases against the same source of truth
- [x] Unify visual audit report output to `data/reports/latest_visual_health.json` across CJS/MJS runners and align npm scripts/docs to real audit entry points
- [x] Keep post-roadmap hardening low-risk: contract cleanup only, no runtime or workspace behavior changes
- [x] Verify build, restart, audit parity, runtime readiness and no new diagnostics after M131

### M132 - public/data Drift Sweep First Cut (P2)
- [x] Canonicalize `data/` as source of truth and clean generated `public/data` drift for `fs`, `link_checker`, `reports` and `out`
- [x] Align pre-deployment sync so `public/data/articles` is refreshed from `data/articles` while generated public-data dirs are pruned
- [x] Keep hardening low-risk: publication contract cleanup only, no runtime behavior changes
- [x] Verify build, pre-deployment sync parity, runtime readiness and no new diagnostics after M132

### M133 - Audit Docs and Inventory Dedupe Sweep (P2)
- [x] Canonicalize audit documentation to `docs/audit_system_documentation.md` and keep only `docs/audit_system_finalization.md` as the historical closure note
- [x] Remove deprecated audit doc aliases plus the duplicate inventory alias `data/reports/bloginventory.txt`
- [x] Keep hardening low-risk: documentation and report-name cleanup only, no runtime or publication behavior changes
- [x] Verify diagnostics, canonical doc references and no new regressions after M133

### M134 - public/data Minimal Published Output Sweep (P2)
- [x] Tighten pre-deployment gate so `public/data` is reduced to the published `articles` output only
- [x] Prune residual public-data mirrors and non-JSON article artifacts during gate sync while keeping `data/articles` as the only content source of truth
- [x] Keep hardening low-risk: publication contract cleanup only, no runtime or frontend behavior changes
- [x] Verify build, pre-deployment gate parity, published-asset parity and no new diagnostics after M134

### M135 - Link Checker Report Alias Cleanup (P2)
- [x] Canonicalize `data/link_checker` around `latest_audit.json` plus timestamped `audit_report_*.json`
- [x] Remove deprecated latest/health/dashboard/link-health aliases and make `AuditService` prune them on future writes
- [x] Keep hardening low-risk: local artifact cleanup only, no runtime or publication behavior changes
- [x] Verify diagnostics, report parity and no new regressions after M135

### M136 - Eval Report Alias Canonicalization (P2)
- [x] Canonicalize eval latest aliases so `latest.json|md` represent `baseline-core` only while all suites keep `latest-<suite>` plus timestamped history
- [x] Point runtime quality summary to `latest-baseline-core.json` first and keep legacy `latest.json` only as the canonical core compatibility alias
- [x] Keep hardening low-risk: eval artifact cleanup only, no scoring or scenario behavior changes
- [x] Verify build, eval alias parity, runtime readiness and no new diagnostics after M136

### M137 - CI Contract Sweep First Cut (P2)
- [x] Add canonical root `lint` and `build` wrappers so CI and verification runtime call the same package entry points
- [x] Expand eval CI to run `core`, `runtime-core` and `builder-workspace` suites while keeping eval artifact aliases canonicalized by M136
- [x] Keep hardening low-risk: CI/package contract cleanup only, no runtime or scoring behavior changes
- [x] Verify lint, build, live eval alias behavior, runtime quality summary and no new diagnostics after M137

### M138 - Benchmark Contract Sweep First Cut (P2)
- [x] Canonicalize performance benchmark execution around `scripts/benchmark_performance.mjs` with a stable article fixture fallback instead of a missing hardcoded input
- [x] Write canonical benchmark artifacts to `data/reports/benchmarks/latest-performance.json` plus timestamped history and keep `data/performance_benchmarks.json` as a compatibility alias
- [x] Keep hardening low-risk: benchmark contract cleanup only, no runtime, scoring or eval behavior changes
- [x] Verify lint, build, benchmark artifact parity and no new diagnostics after M138

### M139 - Benchmark CI and Docs Closure Sweep (P2)
- [x] Add a dedicated benchmark workflow so the canonical performance runner is covered in CI without changing runtime or eval gates
- [x] Document canonical benchmark runner, input selection, artifact paths and compatibility aliases in a dedicated contract doc
- [x] Keep hardening low-risk: workflow and docs only, no benchmark logic or runtime behavior changes
- [x] Verify lint, build, benchmark parity, benchmark workflow contract and no new diagnostics after M139

### M140 - Benchmark Regression Gate and Reporting Sweep (P2)
- [x] Add a canonical benchmark regression summary script comparing latest benchmark output against the previous history snapshot with warning thresholds
- [x] Extend benchmark workflow and docs so CI publishes benchmark regression summaries and the contract defines `NO_BASELINE`/`PASS`/`WARN` semantics
- [x] Keep hardening low-risk: benchmark reporting and CI contract only, no runtime, eval or benchmark measurement logic changes
- [x] Verify lint, build, benchmark latest/history parity, regression summary artifacts and no new diagnostics after M140

### M141 - Strict Benchmark Gate Calibration Sweep (P2)
- [x] Calibrate default benchmark regression thresholds to match observed benchmark jitter while keeping regression detection meaningful
- [x] Run benchmark workflow in strict mode with explicit calibrated env values and document the calibrated strict contract
- [x] Keep hardening low-risk: threshold policy only, no runtime, eval or benchmark measurement logic changes
- [x] Verify lint, build, benchmark regression strict-mode pass, calibrated summary status and no new diagnostics after M141

### M142 - Baseline Guardrails and Final Closure Report (P2)
- [x] Close M0 by documenting working baseline commands, adding a minimal smoke suite and adding a PR regression note template
- [x] Add a final roadmap closure report that separates finished work, polish-only items and remaining blockers to full product closure
- [x] Keep hardening low-risk: documentation, smoke coverage and reporting only, no runtime, eval or benchmark logic changes
- [x] Verify lint, build, smoke suite, document parity and no new diagnostics after M142

### M143 - Final System Status Decision Sweep (P2)
- [x] Freeze eval artifact semantics into `fixture-backed` vs `live-backed` so final status claims use one explicit decision rule
- [x] Add a final status decision document that states whether the system is officially finished and what still blocks full product closure
- [x] Keep hardening low-risk: status semantics and documentation only, no runtime, eval, CI or benchmark logic changes
- [x] Verify documentation parity, diagnostics and no new regressions after M143

### M144 - Live Eval Observability Closure Sweep (P2)
- [x] Freeze live-backed `baseline-core` and `baseline-runtime-core` latest artifacts as non-blocking observability while keeping fixture-backed eval gates canonical for closure
- [x] Remove misleading orphan trace/checkpoint refs from eval reports when no matching task exists and align README/closure docs with the downgraded live artifact semantics
- [x] Keep hardening low-risk: eval reporting semantics and documentation only, no runtime, CI, scoring or benchmark logic changes
- [x] Verify lint, build, document parity, eval report hygiene and no new diagnostics after M144

### M145 - Status Source-of-Truth Canonicalization Sweep (P3)
- [x] Canonicalize repo guidance so tracker and closure docs are the source of truth for current status while the masterplan is explicitly historical/design-only
- [x] Align README, tracker intro and closure docs to one status contract and remove the implication that the masterplan is the live operational source
- [x] Keep maintenance low-risk: documentation semantics only, no runtime, eval, CI or benchmark logic changes
- [x] Verify lint, build, documentation parity and no new diagnostics after M145

### M146 - Post-Closure Maintenance Freeze (P3)
- [x] Freeze a canonical post-closure maintenance backlog that separates must-have maintenance, optional polish and future expansion
- [x] Remove fake external AI telemetry defaults so post-closure observability remains truthful instead of reporting invented metrics
- [x] Keep maintenance low-risk: documentation semantics and truthful observability only, no runtime, eval, CI or benchmark logic changes
- [x] Verify lint, build, documentation parity, external AI stats shape and no new diagnostics after M146

### M147 - Benchmark Alias Dedupe Sweep (P3)
- [x] Remove legacy benchmark wrapper and compatibility artifact so the benchmark contract uses only canonical runner and canonical report paths
- [x] Align benchmark workflow, benchmark contract docs and inventory docs to the canonical benchmark paths only
- [x] Keep maintenance low-risk: benchmark alias cleanup only, no runtime, eval, CI semantics or benchmark methodology changes
- [x] Verify lint, build, benchmark run, regression run, repo parity and no new diagnostics after M147

### M148 - Docs Parity Closure Sweep (P3)
- [x] Align README, eval docs, closure docs and benchmark docs to one semantically consistent story for fixture-backed vs live-backed artifacts
- [x] Clarify builder-workspace observability and canonical benchmark artifact naming without changing runtime, eval, CI or benchmark behavior
- [x] Keep maintenance low-risk: documentation parity only, no runtime or artifact contract changes
- [x] Verify lint, build, documentation parity and no new diagnostics after M148

### M149 - Task History Autosummary Polish Sweep (P3)
- [x] Add compact autosummary and day-based grouping for completed and failed task history without changing runtime, API or persistence semantics
- [x] Keep maintenance low-risk: UI-only polish via selectors and rendering, no task schema, eval, CI or benchmark contract changes
- [x] Reflect the optional polish completion in the post-closure maintenance backlog
- [x] Verify lint, build, UI parity and no new diagnostics after M149

### M150 - Task History Archive Semantics Sweep (P3)
- [x] Add UI-only archive semantics for completed and failed task history without introducing a new task status or changing runtime, API or persistence semantics
- [x] Clarify destructive copy so archive means hide in history view while delete remains permanent removal
- [x] Keep maintenance low-risk: TaskManager-only polish, no task schema, eval, CI or benchmark contract changes
- [x] Verify lint, build, UI parity and no new diagnostics after M150

### M151 - GAIOS Full Documentation Sweep (P3)
- [x] Add a canonical full-product documentation document covering what GAIOS is, what it can do, ideal use cases, scalability and development potential
- [x] Link the new documentation from README so the system overview is easy to discover from canonical docs
- [x] Keep maintenance low-risk: documentation only, no runtime, eval, CI or benchmark behavior changes
- [x] Verify documentation parity and no new diagnostics after M151

### M152 - Blog Clean Slate and TechNova Refresh Sweep (P3)
- [x] Reset the blog content stores to a true clean slate by removing published articles, legacy article directories and article image libraries while keeping canonical indexes empty and writable
- [x] Refresh the public TechNova shell toward the live `jakubnetza.com/technova` look by switching to the canonical design system and adding a polished empty-state experience
- [x] Keep the reset low-risk: no task/runtime contract changes, and keep benchmark generation working from a synthetic fallback when the editorial store is intentionally empty
- [x] Verify lint, build, blog API empty state, benchmark fallback and no new diagnostics after M152

### M153 - Blog Starter Workflow Sweep (P3)
- [x] Add a clean-slate article creation workflow with canonical commands for stub creation, validation, index rebuild, mirror sync and article audit
- [x] Restore missing validation support used by blog publishing flows and rebuild the article index from article metadata instead of legacy filename-only lists
- [x] Keep the workflow low-risk: no new runtime contracts, just operational tooling and documentation for a clean editorial restart
- [x] Verify lint, build, article stub creation, article validation, index rebuild, mirror sync and no new diagnostics after M153

### M154 - TechNova Shell 1:1 Polish Sweep (P3)
- [x] Keep the clean-slate blog visually closer to live TechNova by preserving the hero and sidebar magazine structure even when no articles exist
- [x] Replace generic empty placeholders with premium TechNova-style hero and top-stories shell copy while keeping the canonical empty indexes intact
- [x] Keep the polish low-risk: frontend-only shell rendering and CSS, no article schema, workflow or runtime contract changes
- [x] Verify lint, build, diagnostics and local TechNova shell rendering after M154

### M155 - TechNova Shell Deep Polish Sweep (P3)
- [x] Bring the clean-slate shell even closer to live TechNova by keeping category/tag rhythm, multi-card feed rhythm and ranked sidebar rhythm visible without restoring articles
- [x] Add richer placeholder cards and default tag shells so the page keeps the editorial magazine feel even with empty article indexes
- [x] Keep the polish low-risk: frontend-only JS/CSS shell adjustments, no article schema, workflow, API or runtime contract changes
- [x] Verify lint, build, diagnostics and local clean-slate TechNova shell parity after M155

### M156 - First Article Launch Sweep (P3)
- [x] Materialize the first production-ready article package for `airpods-4-review` in canonical source and public mirror form so the clean-slate blog becomes a live magazine again
- [x] Fix affiliate audit extraction so valid `tag=kimsondreams-21` Amazon links survive the audit and the first article passes image plus affiliate checks cleanly
- [x] Keep the launch low-risk: no workflow or runtime contract changes beyond article package completion and audit parser correctness
- [x] Verify article validation, index rebuild, mirror sync, audit, blog API, detail rendering, lint, build and no new diagnostics after M156

### M157 - TechNova Visual Precision Sweep (P3)
- [x] Tighten the homepage shell toward the reference composition by matching smaller logo scale, darker/faster header fade, narrower content width and more compressed spacing rhythm
- [x] Refine card, pill, sidebar and CTA sizing so the visual hierarchy is closer to the provided TechNova reference even when the data shape differs
- [x] Keep the polish low-risk: frontend-only HTML, CSS and shell JS adjustments, no article schema, workflow, API or runtime contract changes
- [x] Verify lint, build, diagnostics and local TechNova rendering after M157

### M158 - TechNova Pixel-Perfect Pass (P3)
- [x] Extract exact CSS metrics from live TechNova using Puppeteer script (1152px width, 64px logo, 31px headings)
- [x] Apply calculated spacing, layout, and font sizing across `design-system.css`, `index.html`, and `technova.js`
- [x] Verify layout against live reference to ensure 1:1 parity without Framer DOM bloat
- [x] Commit and push changes to trigger Railway deployment

### M159 - TechNova Content Population (P3)
- [x] Create multiple new article stubs using the clean-slate workflow (`best-smartphones-photography-2026`, `sony-wh-1000xm5-2026`, etc.)
- [x] Add placeholder images for the newly generated content
- [x] Rebuild article index and sync the published mirror
- [x] Verify front-end feed, hero, and sidebar rendering with realistic content

## PR Train (Recommended Order)
- [x] PR1: Runtime scaffold (`services/runtime/` + adapters, no behavior change)
- [x] PR2: Shared toolRuntime extraction + parity validation
- [x] PR3: AgentRouter switched to shared toolRuntime
- [x] PR4: Brain vs Agents metadata + routing enforcement
- [x] PR5: Task schema upgrade + UI rendering
- [x] PR6: Verification runtime + verify-before-complete enforcement
- [x] PR7: Checkpoints + rollback runtime + UI entry points
- [x] PR8: Execution trace v1 consolidation
- [x] PR9: Unified UI store
- [x] PR10: Operational memory improvements
- [x] PR11: Eval harness
- [x] PR12: Builder workspace v1

## Validation Checklist Per PR (Paste into PR description)
- [ ] Live chat answers without extra auto-ack bubbles
- [ ] Task intent triggers task execution, not live chat
- [ ] Tools execute correctly with expected guardrails
- [ ] Task cannot complete without verify/evidence (when enabled)
- [ ] Checkpoint exists before risky actions (when enabled)
- [ ] Rollback restores state (when enabled)
- [ ] UI reflects the same state across Terminal/TaskManager

## Notes / Decisions Log
- 2026-03-31: GAIOS is local and single-user; prioritize autonomy safety and execution quality over SaaS security.
- 2026-03-31: User live chat should be Brain-only; agents are reserved for tasks.
