import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { PooledWebView, useWarmUp } from 'react-native-instant-webview';
import { SCENARIO_ORDER } from './constants';
import type { BenchmarkConfig, ScenarioType, TrialResult } from './types';

// performance.now() is available at runtime in React Native but may lack type defs
const now = (): number => {
  const g = globalThis as unknown as { performance?: { now(): number } };
  return g.performance ? g.performance.now() : Date.now();
};

type RunnerState =
  | 'idle'
  | 'mounting'
  | 'loaded'
  | 'cooldown'
  | 'warmup_wait'
  | 'priming'
  | 'priming_cooldown'
  | 'complete';

interface BenchmarkRunnerProps {
  config: BenchmarkConfig;
  running: boolean;
  onTrialComplete: (result: TrialResult) => void;
  onAllComplete: () => void;
  onProgress: (scenarioIndex: number, trialIndex: number) => void;
}

export default function BenchmarkRunner({
  config,
  running,
  onTrialComplete,
  onAllComplete,
  onProgress,
}: BenchmarkRunnerProps) {
  const { warmUp, cancelWarmUp } = useWarmUp();

  const [state, setState] = useState<RunnerState>('idle');
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [trialIdx, setTrialIdx] = useState(0);
  const [mountWebView, setMountWebView] = useState(false);
  const [isPriming, setIsPriming] = useState(false);

  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentScenario = SCENARIO_ORDER[scenarioIdx] as ScenarioType;

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMountWebView(false);
    setIsPriming(false);
    setState('idle');
    setScenarioIdx(0);
    setTrialIdx(0);
  }, []);

  // Start benchmark when running becomes true
  useEffect(() => {
    if (running) {
      setScenarioIdx(0);
      setTrialIdx(0);
      startTrial('normal', 0);
    } else {
      cleanup();
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const startTrial = useCallback(
    (scenario: ScenarioType, trial: number) => {
      onProgress(SCENARIO_ORDER.indexOf(scenario), trial);

      switch (scenario) {
        case 'normal':
        case 'pooled_cold':
          // Directly mount and measure
          startTimeRef.current = now();
          setMountWebView(true);
          setState('mounting');
          break;

        case 'pooled_warm':
          // Warm up first, then wait, then mount
          warmUp(config.url);
          setState('warmup_wait');
          timerRef.current = setTimeout(() => {
            startTimeRef.current = now();
            setMountWebView(true);
            setState('mounting');
          }, config.warmUpDelayMs);
          break;

        case 'pooled_reuse':
          // Prime: mount once to load, then unmount, cooldown, then re-mount
          startTimeRef.current = 0; // not measuring prime
          setIsPriming(true);
          setMountWebView(true);
          setState('priming');
          break;
      }
    },
    [config.url, config.warmUpDelayMs, onProgress, warmUp],
  );

  const advanceToNext = useCallback(
    (scenario: ScenarioType, trial: number) => {
      const nextTrial = trial + 1;
      if (nextTrial < config.trialsPerScenario) {
        // More trials in same scenario
        setState('cooldown');
        setMountWebView(false);
        timerRef.current = setTimeout(() => {
          startTrial(scenario, nextTrial);
          setTrialIdx(nextTrial);
        }, config.cooldownMs);
      } else {
        // Move to next scenario
        const nextScenarioIdx = SCENARIO_ORDER.indexOf(scenario) + 1;
        if (nextScenarioIdx < SCENARIO_ORDER.length) {
          setState('cooldown');
          setMountWebView(false);
          timerRef.current = setTimeout(() => {
            const nextScenario = SCENARIO_ORDER[nextScenarioIdx]!;
            setScenarioIdx(nextScenarioIdx);
            setTrialIdx(0);
            startTrial(nextScenario, 0);
          }, config.cooldownMs);
        } else {
          // All done
          setMountWebView(false);
          setState('complete');
          onAllComplete();
        }
      }
    },
    [config.cooldownMs, config.trialsPerScenario, onAllComplete, startTrial],
  );

  const handleLoad = useCallback(() => {
    if (state === 'priming') {
      // Prime load finished — unmount and cooldown before actual measurement
      setMountWebView(false);
      setIsPriming(false);
      setState('priming_cooldown');
      timerRef.current = setTimeout(() => {
        // Now mount for real measurement
        startTimeRef.current = now();
        setMountWebView(true);
        setState('mounting');
      }, config.cooldownMs);
      return;
    }

    if (state !== 'mounting') return;

    const elapsed = now() - startTimeRef.current;
    setState('loaded');

    const result: TrialResult = {
      scenario: currentScenario,
      url: config.url,
      elapsed,
      trialIndex: trialIdx,
    };
    onTrialComplete(result);

    // Cancel warm-up if applicable (cleanup)
    if (currentScenario === 'pooled_warm') {
      cancelWarmUp(config.url);
    }

    // Unmount and advance
    advanceToNext(currentScenario, trialIdx);
  }, [
    state,
    currentScenario,
    config.url,
    config.cooldownMs,
    trialIdx,
    onTrialComplete,
    cancelWarmUp,
    advanceToNext,
  ]);

  if (!running || !mountWebView) {
    return <View style={styles.container} />;
  }

  // Render the appropriate WebView
  if (currentScenario === 'normal') {
    return (
      <View style={styles.container}>
        <WebView
          source={{ uri: config.url }}
          onLoad={handleLoad}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PooledWebView
        source={{ uri: config.url }}
        containerStyle={StyleSheet.absoluteFill}
        onLoad={handleLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
});
