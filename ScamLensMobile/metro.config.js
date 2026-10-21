const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// 1. Get the base Expo Metro configuration
const config = getDefaultConfig(__dirname);

// 2. Extract resolver and transformer structures
const { transformer, resolver } = config;

// 3. Configure the SVG transformer
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

// 4. Update the resolver to process .svg as source code instead of an asset file
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
};

// 5. Wrap the modified config with NativeWind
module.exports = withNativeWind(config, {
  input: "./global.css",
});
