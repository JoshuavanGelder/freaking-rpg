// Het buildnummer van GitHub Actions wordt het versienummer van de app,
// zodat elke nieuwe APK netjes over de vorige heen installeert.
const build = Number(process.env.GITHUB_RUN_NUMBER || 1);

module.exports = {
  expo: {
    name: 'Freaking RPG',
    slug: 'freaking-rpg',
    scheme: 'freakingrpg',
    version: `0.1.${build}`,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    backgroundColor: '#15120F',
    android: {
      package: 'nl.freakingrpg.app',
      versionCode: build,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#15120F',
      },
      softwareKeyboardLayoutMode: 'resize',
    },
    plugins: ['expo-font'],
  },
};
