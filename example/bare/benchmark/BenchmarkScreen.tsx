import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import BenchmarkRunner from './BenchmarkRunner';
import BenchmarkResults from './BenchmarkResults';
import {
  DEFAULT_BENCHMARK_CONFIG,
  SCENARIO_LABELS,
  SCENARIO_ORDER,
  URL_OPTIONS,
} from './constants';
import type { BenchmarkConfig, BenchmarkPhase, TrialResult } from './types';

export default function BenchmarkScreen() {
  const [config, setConfig] = useState<BenchmarkConfig>(DEFAULT_BENCHMARK_CONFIG);
  const [phase, setPhase] = useState<BenchmarkPhase>('idle');
  const [results, setResults] = useState<TrialResult[]>([]);
  const [currentScenarioIdx, setCurrentScenarioIdx] = useState(0);
  const [currentTrialIdx, setCurrentTrialIdx] = useState(0);

  const totalTrials = SCENARIO_ORDER.length * config.trialsPerScenario;
  const completedTrials =
    currentScenarioIdx * config.trialsPerScenario + currentTrialIdx;
  const progressPercent = totalTrials > 0 ? (completedTrials / totalTrials) * 100 : 0;

  const handleRun = useCallback(() => {
    setResults([]);
    setCurrentScenarioIdx(0);
    setCurrentTrialIdx(0);
    setPhase('running');
  }, []);

  const handleTrialComplete = useCallback((result: TrialResult) => {
    setResults((prev) => [...prev, result]);
  }, []);

  const handleAllComplete = useCallback(() => {
    setPhase('complete');
  }, []);

  const handleProgress = useCallback(
    (scenarioIndex: number, trialIndex: number) => {
      setCurrentScenarioIdx(scenarioIndex);
      setCurrentTrialIdx(trialIndex);
    },
    [],
  );

  const selectUrl = useCallback((url: string) => {
    setConfig((prev) => ({ ...prev, url }));
  }, []);

  const currentScenarioLabel =
    phase === 'running'
      ? SCENARIO_LABELS[SCENARIO_ORDER[currentScenarioIdx]!]
      : '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Benchmark</Text>
      <Text style={styles.subtitle}>
        Compare loading times across 4 scenarios
      </Text>

      {/* URL Selection */}
      <Text style={styles.sectionLabel}>URL</Text>
      <View style={styles.urlGroup}>
        {URL_OPTIONS.map((url) => {
          const isSelected = config.url === url;
          return (
            <TouchableOpacity
              key={url}
              style={[styles.urlButton, isSelected && styles.urlButtonSelected]}
              onPress={() => selectUrl(url)}
              disabled={phase === 'running'}
            >
              <Text
                style={[
                  styles.urlButtonText,
                  isSelected && styles.urlButtonTextSelected,
                ]}
                numberOfLines={1}
              >
                {url.replace('https://', '')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Trials Info */}
      <Text style={styles.trialsInfo}>
        {config.trialsPerScenario} trials per scenario ({totalTrials} total)
      </Text>

      {/* Run Button */}
      <TouchableOpacity
        style={[styles.runButton, phase === 'running' && styles.runButtonDisabled]}
        onPress={handleRun}
        disabled={phase === 'running'}
      >
        <Text style={styles.runButtonText}>
          {phase === 'running' ? 'Running...' : 'Run Benchmark'}
        </Text>
      </TouchableOpacity>

      {/* Progress */}
      {phase === 'running' && (
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            {currentScenarioLabel} - Trial {currentTrialIdx + 1}/
            {config.trialsPerScenario}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
          <Text style={styles.progressPercent}>
            {Math.round(progressPercent)}%
          </Text>
        </View>
      )}

      {/* WebView Render Area */}
      <View style={styles.runnerArea}>
        <BenchmarkRunner
          config={config}
          running={phase === 'running'}
          onTrialComplete={handleTrialComplete}
          onAllComplete={handleAllComplete}
          onProgress={handleProgress}
        />
      </View>

      {/* Results */}
      {phase === 'complete' && <BenchmarkResults results={results} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  urlGroup: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 6,
  },
  urlButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
  },
  urlButtonSelected: {
    borderColor: '#007bff',
    backgroundColor: '#e7f1ff',
  },
  urlButtonText: {
    fontSize: 11,
    color: '#495057',
  },
  urlButtonTextSelected: {
    color: '#007bff',
    fontWeight: '600',
  },
  trialsInfo: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 16,
    textAlign: 'center',
  },
  runButton: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  runButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  runButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 6,
    textAlign: 'center',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  runnerArea: {
    marginBottom: 16,
  },
});
