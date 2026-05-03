const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the entire workspace root so Metro picks up changes in shared
// libs (e.g. lib/api-client-react) during development. EAS Build also
// needs this to resolve the workspace:* dependency at bundle time.
config.watchFolders = [workspaceRoot];

// Make Metro resolve node_modules from both the app dir and the
// workspace root (where pnpm hoists shared packages).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Treat .riv files as bundled binary assets so `require("../assets/rive/foo.riv")`
// returns a Metro asset id consumable by rive-react-native.
if (!config.resolver.assetExts.includes("riv")) {
  config.resolver.assetExts.push("riv");
}

module.exports = config;
