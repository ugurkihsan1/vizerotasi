const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  {
    ignores: [
      "dist/**",
      "dist-pages/**",
      "dist-all/**",
      "dist-native/**",
      ".expo/**",
      "supabase/**",
    ],
  },
]);
