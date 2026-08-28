module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 roda em cima do react-native-worklets: o plugin precisa ser o último.
    plugins: ['react-native-worklets/plugin'],
  };
};
