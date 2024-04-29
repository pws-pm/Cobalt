//import pluginCSS from "@cobalt-ui/plugin-css";
// Instead of the cobalt plugin CSS use Figma Anima plugin CSS, add the inset shadows manually as a bug prevents to generate them
import pluginSass from "@cobalt-ui/plugin-sass";
import pluginMAUI from "./plugins/pluginMAUI.js";

/** @type {import("@cobalt-ui/core").Config} */
export default {
  tokens: "./_input/design.tokens.json",
  outDir: "./_output",
  plugins: [
    pluginSass(),
    //pluginCSS(),
    pluginMAUI({
      excludePatterns: ["^colorbase"]
    })
  ]
};