import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { WebViewPoolProvider, PooledWebView } from 'react-native-instant-webview';
import BenchmarkScreen from './benchmark/BenchmarkScreen';

const URLS = [
  'https://reactnative.dev',
  'https://github.com',
  'https://expo.dev',
];

// -- Shared Components --

function LoadingIndicator() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#007bff" />
    </View>
  );
}

// -- Pooled Tab Screens --

function PooledHomeScreen({ navigation }: any) {
  return (
    <View style={styles.home}>
      <Text style={styles.title}>Pooled WebView</Text>
      <Text style={styles.subtitle}>Uses pre-warmed pool instances</Text>
      {URLS.map((url) => (
        <TouchableOpacity
          key={url}
          style={[styles.link, styles.linkPooled]}
          onPress={() => navigation.push('PooledDetail', { url })}
        >
          <Text style={styles.linkText}>{url}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PooledDetailScreen({ route }: any) {
  const { url } = route.params;
  const [loading, setLoading] = useState(true);
  return (
    <View style={styles.screen}>
      <PooledWebView
        source={{ uri: url }}
        containerStyle={StyleSheet.absoluteFill}
        onLoadEnd={() => setLoading(false)}
        onBorrowed={(id) => console.log(`Borrowed: ${id}`)}
        onReturned={(id) => console.log(`Returned: ${id}`)}
        onPoolExhausted={() => console.warn('Pool exhausted!')}
      />
      {loading && <LoadingIndicator />}
    </View>
  );
}

// -- Normal Tab Screens --

function NormalHomeScreen({ navigation }: any) {
  return (
    <View style={styles.home}>
      <Text style={styles.title}>Normal WebView</Text>
      <Text style={styles.subtitle}>Creates a new WebView each time</Text>
      {URLS.map((url) => (
        <TouchableOpacity
          key={url}
          style={[styles.link, styles.linkNormal]}
          onPress={() => navigation.push('NormalDetail', { url })}
        >
          <Text style={styles.linkText}>{url}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function NormalDetailScreen({ route }: any) {
  const { url } = route.params;
  const [loading, setLoading] = useState(true);
  return (
    <View style={styles.screen}>
      <WebView
        source={{ uri: url }}
        style={StyleSheet.absoluteFill}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && <LoadingIndicator />}
    </View>
  );
}

// -- Navigation Setup --

const PooledStack = createNativeStackNavigator();
function PooledTabStack() {
  return (
    <PooledStack.Navigator>
      <PooledStack.Screen name="PooledHome" component={PooledHomeScreen} options={{ title: 'Pooled' }} />
      <PooledStack.Screen name="PooledDetail" component={PooledDetailScreen} options={({ route }: any) => ({ title: route.params.url })} />
    </PooledStack.Navigator>
  );
}

const NormalStack = createNativeStackNavigator();
function NormalTabStack() {
  return (
    <NormalStack.Navigator>
      <NormalStack.Screen name="NormalHome" component={NormalHomeScreen} options={{ title: 'Normal' }} />
      <NormalStack.Screen name="NormalDetail" component={NormalDetailScreen} options={({ route }: any) => ({ title: route.params.url })} />
    </NormalStack.Navigator>
  );
}

const BenchmarkStack = createNativeStackNavigator();
function BenchmarkTabStack() {
  return (
    <BenchmarkStack.Navigator>
      <BenchmarkStack.Screen name="BenchmarkHome" component={BenchmarkScreen} options={{ title: 'Benchmark' }} />
    </BenchmarkStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <WebViewPoolProvider config={{ poolSize: 3 }}>
      <NavigationContainer>
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen name="Pooled" component={PooledTabStack} options={{ tabBarBadge: 'Pool' }} />
          <Tab.Screen name="Normal" component={NormalTabStack} />
          <Tab.Screen name="Benchmark" component={BenchmarkTabStack} />
        </Tab.Navigator>
      </NavigationContainer>
    </WebViewPoolProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  home: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 32,
    textAlign: 'center',
  },
  link: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  linkPooled: {
    backgroundColor: '#007bff',
  },
  linkNormal: {
    backgroundColor: '#6c757d',
  },
  linkText: {
    color: '#fff',
    fontSize: 16,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
