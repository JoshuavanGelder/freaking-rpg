// Metro kent .ogg niet standaard als bestand om mee te bundelen; de geluiden in assets/sounds zijn ogg.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes('ogg')) config.resolver.assetExts.push('ogg');

module.exports = config;
