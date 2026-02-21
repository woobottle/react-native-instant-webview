import type { BenchmarkConfig, ScenarioType } from './types';

export const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig = {
  url: 'https://reactnative.dev',
  trialsPerScenario: 5,
  cooldownMs: 2000,
  warmUpDelayMs: 5000,
};

export const SCENARIO_ORDER: ScenarioType[] = [
  'normal',
  'pooled_cold',
  'pooled_warm',
  'pooled_reuse',
];

export const SCENARIO_LABELS: Record<ScenarioType, string> = {
  normal: 'Regular WebView',
  pooled_cold: 'Pooled (Cold)',
  pooled_warm: 'Pooled (Warm)',
  pooled_reuse: 'Pooled (Reuse)',
};

export const SCENARIO_COLORS: Record<ScenarioType, string> = {
  normal: '#6c757d',
  pooled_cold: '#007bff',
  pooled_warm: '#28a745',
  pooled_reuse: '#17a2b8',
};

export const URL_OPTIONS = [
  'https://reactnative.dev',
  'https://github.com',
  'https://expo.dev',
];
