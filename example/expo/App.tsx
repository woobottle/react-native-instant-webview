import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WebViewPoolProvider, PooledWebView } from 'react-native-instant-webview';

const URLS = [
  'https://reactnative.dev',
  'https://github.com',
  'https://expo.dev',
];

function WebViewScreen({ url, onBack }: { url: string; onBack: () => void }) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.url} numberOfLines={1}>
          {url}
        </Text>
      </View>
      <PooledWebView
        source={{ uri: url }}
        containerStyle={styles.webview}
        onBorrowed={(id) => console.log(`Borrowed: ${id}`)}
        onReturned={(id) => console.log(`Returned: ${id}`)}
        onPoolExhausted={() => console.warn('Pool exhausted!')}
      />
    </View>
  );
}

function HomeScreen({ onNavigate }: { onNavigate: (url: string) => void }) {
  return (
    <View style={styles.home}>
      <Text style={styles.title}>Instant WebView Demo</Text>
      <Text style={styles.subtitle}>
        Tap a link — WebViews are pooled and reused
      </Text>
      {URLS.map((url) => (
        <TouchableOpacity
          key={url}
          style={styles.link}
          onPress={() => onNavigate(url)}
        >
          <Text style={styles.linkText}>{url}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Navigation() {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  if (currentUrl) {
    return (
      <WebViewScreen url={currentUrl} onBack={() => setCurrentUrl(null)} />
    );
  }

  return <HomeScreen onNavigate={setCurrentUrl} />;
}

export default function App() {
  return (
    <WebViewPoolProvider config={{ poolSize: 3 }}>
      <Navigation />
    </WebViewPoolProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  backButton: {
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    color: '#007bff',
  },
  url: {
    flex: 1,
    fontSize: 14,
    color: '#6c757d',
  },
  webview: {
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
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  linkText: {
    color: '#fff',
    fontSize: 16,
  },
});
