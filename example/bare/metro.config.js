const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const projectRoot = __dirname;
const libraryRoot = path.resolve(projectRoot, '../..');

const defaultConfig = getDefaultConfig(projectRoot);

// Escape special regex characters in the path
const libraryNodeModules = path.resolve(libraryRoot, 'node_modules');
const escapedLibraryNodeModules = libraryNodeModules.replace(/[/\\]/g, '[/\\\\]');

const config = {
  watchFolders: [libraryRoot],
  resolver: {
    // Block the library root's copies of react, react-native, and react-native-webview
    // so Metro always resolves to the example app's single copies.
    blockList: exclusionList([
      new RegExp(`${escapedLibraryNodeModules}[/\\\\]react[/\\\\].*`),
      new RegExp(`${escapedLibraryNodeModules}[/\\\\]react-native[/\\\\].*`),
      new RegExp(`${escapedLibraryNodeModules}[/\\\\]react-native-webview[/\\\\].*`),
    ]),
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(libraryRoot, 'node_modules'),
    ],
    extraNodeModules: {
      react: path.resolve(projectRoot, 'node_modules/react'),
      'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
      'react-native-webview': path.resolve(projectRoot, 'node_modules/react-native-webview'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
