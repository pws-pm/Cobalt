import pluginCSS from "@cobalt-ui/plugin-css";
import pluginSass from "@cobalt-ui/plugin-sass";
//import xamlPlugin from './plugins/xamlPlugin.js';



/** @type {import("@cobalt-ui/core").Config} */
export default {
  tokens: "./tokens.json",
  outDir: "./build/variables/",
  plugins: [
    pluginSass()
    //xamlPlugin({ defaultFilename: 'resources.xaml' })
  ]
};