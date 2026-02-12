const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Add the shared directory to watchFolders
const workspaceRoot = path.resolve(__dirname, "..");
config.watchFolders = [workspaceRoot];

// Ensure node_modules from workspace root are also resolved (if monorepo)
config.resolver.nodeModulesPaths = [
    path.resolve(__dirname, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
];

// NOTE: withNativeWind removed due to conflict with React Navigation v7
// Using inline styles instead of NativeWind className
module.exports = config;
