const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Work around Firebase Auth resolution issues in Expo/Metro native bundles.
config.resolver.unstable_enablePackageExports = false;

if (!config.resolver.sourceExts.includes("cjs")) {
  config.resolver.sourceExts.push("cjs");
}

module.exports = config;
