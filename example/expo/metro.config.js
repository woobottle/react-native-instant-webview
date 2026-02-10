const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const libraryRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the parent library source for live changes
config.watchFolders = [libraryRoot];

// Only resolve from example's node_modules (not library's)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Force shared deps to resolve from example's node_modules
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-webview': path.resolve(projectRoot, 'node_modules/react-native-webview'),
};

// Block the library's node_modules copies of react/react-native to prevent duplicates
const exclusionList = require('metro-config/src/defaults/exclusionList');
config.resolver.blockList = exclusionList([
  new RegExp(path.resolve(libraryRoot, 'node_modules/react/').replace(/[/\\]/g, '[/\\\\]') + '.*'),
  new RegExp(path.resolve(libraryRoot, 'node_modules/react-native/').replace(/[/\\]/g, '[/\\\\]') + '.*'),
  new RegExp(path.resolve(libraryRoot, 'node_modules/react-native-webview/').replace(/[/\\]/g, '[/\\\\]') + '.*'),
]);

module.exports = config;
