const { getDefaultConfig } = require('expo/metro-config');
const { resolver: defaultResolver } = getDefaultConfig(__dirname);
const path = require('path');

const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  extraNodeModules: {
    // Add Node.js core module polyfills
    stream: require.resolve('stream-browserify'),
    crypto: require.resolve('react-native-crypto'),
    http: require.resolve('@tradle/react-native-http'),
    https: require.resolve('https-browserify'),
    os: require.resolve('react-native-os'),
    fs: require.resolve('react-native-level-fs'),
    path: require.resolve('path-browserify'),
    zlib: require.resolve('browserify-zlib'),
    events: path.join(__dirname, 'src/utils/node-modules/events.js'),
    net: path.join(__dirname, 'src/utils/node-modules/net.js'),
    tls: path.join(__dirname, 'src/utils/node-modules/tls.js'),
    dgram: path.join(__dirname, 'src/utils/node-modules/dgram.js'),
    ws: path.join(__dirname, 'src/utils/node-modules/ws.js'),
    ...defaultResolver.extraNodeModules,
  },
};

// Module resolver for Node.js modules
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Handle Node.js module resolution
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle built-in Node.js modules
  const nodeModules = {
    'events': 'src/utils/node-modules/events.js',
    'net': 'src/utils/node-modules/net.js',
    'tls': 'src/utils/node-modules/tls.js',
    'dgram': 'src/utils/node-modules/dgram.js',
    'ws': 'src/utils/node-modules/ws.js'
  };
  
  if (nodeModules[moduleName]) {
    return {
      filePath: path.join(__dirname, nodeModules[moduleName]),
      type: 'sourceFile',
    };
  }
  
  // Default resolver from Expo/Metro
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config; 