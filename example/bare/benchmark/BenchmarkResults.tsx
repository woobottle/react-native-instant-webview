import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SCENARIO_COLORS, SCENARIO_LABELS, SCENARIO_ORDER } from './constants';
import type { ScenarioSummary, TrialResult, ScenarioType } from './types';

interface BenchmarkResultsProps {
  results: TrialResult[];
}

function computeSummaries(results: TrialResult[]): ScenarioSummary[] {
  return SCENARIO_ORDER.map((scenario) => {
    const trials = results
      .filter((r) => r.scenario === scenario)
      .map((r) => r.elapsed);

    if (trials.length === 0) {
      return {
        scenario,
        label: SCENARIO_LABELS[scenario],
        trials: [],
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
      };
    }

    const sorted = [...trials].sort((a, b) => a - b);
    const sum = trials.reduce((acc, v) => acc + v, 0);
    const mean = sum / trials.length;
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[mid - 1]! + sorted[mid]!) / 2
        : sorted[mid]!;

    return {
      scenario,
      label: SCENARIO_LABELS[scenario],
      trials,
      mean,
      median,
      min: sorted[0]!,
      max: sorted[sorted.length - 1]!,
    };
  });
}

function BarChart({ summaries }: { summaries: ScenarioSummary[] }) {
  const maxMean = Math.max(...summaries.map((s) => s.mean), 1);

  return (
    <View style={barStyles.container}>
      <Text style={barStyles.title}>Loading Time (ms)</Text>
      {summaries.map((s) => {
        const widthPercent = (s.mean / maxMean) * 100;
        return (
          <View key={s.scenario} style={barStyles.row}>
            <Text style={barStyles.label} numberOfLines={1}>
              {s.label}
            </Text>
            <View style={barStyles.barTrack}>
              <View
                style={[
                  barStyles.barFill,
                  {
                    width: `${widthPercent}%`,
                    backgroundColor: SCENARIO_COLORS[s.scenario],
                  },
                ]}
              />
            </View>
            <Text style={barStyles.value}>{Math.round(s.mean)}ms</Text>
          </View>
        );
      })}
    </View>
  );
}

function SummaryTable({ summaries }: { summaries: ScenarioSummary[] }) {
  return (
    <View style={tableStyles.container}>
      <Text style={tableStyles.title}>Summary</Text>
      <View style={tableStyles.headerRow}>
        <Text style={[tableStyles.cell, tableStyles.headerCell, tableStyles.labelCell]}>
          Scenario
        </Text>
        <Text style={[tableStyles.cell, tableStyles.headerCell]}>Mean</Text>
        <Text style={[tableStyles.cell, tableStyles.headerCell]}>Median</Text>
        <Text style={[tableStyles.cell, tableStyles.headerCell]}>Min</Text>
        <Text style={[tableStyles.cell, tableStyles.headerCell]}>Max</Text>
      </View>
      {summaries.map((s) => (
        <View key={s.scenario} style={tableStyles.row}>
          <Text
            style={[
              tableStyles.cell,
              tableStyles.labelCell,
              { color: SCENARIO_COLORS[s.scenario] },
            ]}
            numberOfLines={1}
          >
            {s.label}
          </Text>
          <Text style={tableStyles.cell}>{Math.round(s.mean)}</Text>
          <Text style={tableStyles.cell}>{Math.round(s.median)}</Text>
          <Text style={tableStyles.cell}>{Math.round(s.min)}</Text>
          <Text style={tableStyles.cell}>{Math.round(s.max)}</Text>
        </View>
      ))}
    </View>
  );
}

function ImprovementSection({ summaries }: { summaries: ScenarioSummary[] }) {
  const normalMean = summaries.find((s) => s.scenario === 'normal')?.mean ?? 0;
  if (normalMean === 0) return null;

  const comparisons = SCENARIO_ORDER.filter((s) => s !== 'normal') as Exclude<
    ScenarioType,
    'normal'
  >[];

  return (
    <View style={improvStyles.container}>
      <Text style={improvStyles.title}>vs Regular WebView</Text>
      {comparisons.map((scenario) => {
        const summary = summaries.find((s) => s.scenario === scenario);
        if (!summary || summary.mean === 0) return null;

        const improvement = ((normalMean - summary.mean) / normalMean) * 100;
        const isImproved = improvement > 0;

        return (
          <View key={scenario} style={improvStyles.row}>
            <View
              style={[
                improvStyles.dot,
                { backgroundColor: SCENARIO_COLORS[scenario] },
              ]}
            />
            <Text style={improvStyles.label}>{summary.label}</Text>
            <Text
              style={[
                improvStyles.value,
                { color: isImproved ? '#28a745' : '#dc3545' },
              ]}
            >
              {isImproved ? '-' : '+'}
              {Math.abs(Math.round(improvement))}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function BenchmarkResults({ results }: BenchmarkResultsProps) {
  const summaries = computeSummaries(results);
  const hasResults = summaries.some((s) => s.trials.length > 0);

  if (!hasResults) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Results</Text>
      <BarChart summaries={summaries} />
      <SummaryTable summaries={summaries} />
      <ImprovementSection summaries={summaries} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
});

const barStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#495057',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    width: 100,
    fontSize: 11,
    color: '#495057',
  },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    width: 60,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    color: '#212529',
  },
});

const tableStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#495057',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingBottom: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  cell: {
    flex: 1,
    fontSize: 11,
    textAlign: 'center',
    color: '#495057',
  },
  headerCell: {
    fontWeight: '600',
    color: '#212529',
  },
  labelCell: {
    flex: 1.5,
    textAlign: 'left',
  },
});

const improvStyles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#495057',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: '#495057',
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
