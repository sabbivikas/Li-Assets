const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Treat .riv files as bundled binary assets so `require("../assets/rive/foo.riv")`
// returns a Metro asset id consumable by rive-react-native.
if (!config.resolver.assetExts.includes("riv")) {
  config.resolver.assetExts.push("riv");
}

module.exports = config;
