import pluginSass from "@cobalt-ui/plugin-sass";
import pluginMAUI from "./plugins/pluginMAUI.js";



/** @type {import("@cobalt-ui/core").Config} */
export default {
  tokens: "./_input/design.tokens.json",
  outDir: "./_output",
  plugins: [
    pluginSass(),
    pluginMAUI({
      outputDirectory: "/xaml",
      excludePatterns: ["^colorbase"]
    })
  ]
};