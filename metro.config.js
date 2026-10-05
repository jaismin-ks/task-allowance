// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle migrations are bundled as .sql files (inlined via babel-plugin-inline-import)
config.resolver.sourceExts.push('sql');

module.exports = config;
