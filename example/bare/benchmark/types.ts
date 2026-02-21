export type ScenarioType =
  | 'normal'
  | 'pooled_cold'
  | 'pooled_warm'
  | 'pooled_reuse';

export interface TrialResult {
  scenario: ScenarioType;
  url: string;
  elapsed: number; // ms
  trialIndex: number;
}

export interface ScenarioSummary {
  scenario: ScenarioType;
  label: string;
  trials: number[];
  mean: number;
  median: number;
  min: number;
  max: number;
}

export interface BenchmarkConfig {
  url: string;
  trialsPerScenario: number;
  cooldownMs: number; // trial 사이 대기 (기본 2000ms)
  warmUpDelayMs: number; // warm-up 로드 대기 (기본 5000ms)
}

export type BenchmarkPhase = 'idle' | 'running' | 'complete';
