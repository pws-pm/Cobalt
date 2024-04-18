/**
 * pluginMAUI - A Cobalt UI plugin to generate XAML ResourceDictionary from design tokens.
 * It supports filtering tokens based on exclusion patterns defined by regular expressions.
 *
 * Usage:
 * - excludePatterns: Optional, Array of string patterns used to exclude tokens based on their IDs.
 * - outputDirectory: Optional, specifies the directory for saving the generated output files.
 *
 * Example:
 * import pluginMAUI from "./plugins/pluginMAUI.js";
 * export default {
 *   plugins: [
 *     pluginMAUI({
 *       excludePatterns: ["^colorbase", "temporary$"]
 *     }),
 *   ],
 * };
 */

import path from 'path';

export default function pluginMAUI(options = {}) {
  const { excludePatterns = [], outputDirectory = "" } = options;

  return {
    name: "pluginMAUI",
    async build({ tokens, rawSchema, outDir }) {
      if (!Array.isArray(tokens)) {
        throw new Error("Invalid tokens array provided to pluginMAUI");
      }

      // Resolve the full path combining the main outDir with the plugin-specific outputDirectory
      // Ensuring it handles both relative and absolute plugin-specific directories correctly
      const resolvedOutputDirectory = outputDirectory.startsWith('/') ?
                                      outputDirectory.substring(1) : outputDirectory;
      const fullOutputPath = path.join(outDir, resolvedOutputDirectory); // Use path.join to correctly handle paths

      const allModes = detectAllModes(tokens);
      let baseContent = createResourceDictionary(tokens, excludePatterns, convertTokenToMAUI);

      // Initial output setup for base theme file
      const outputs = [{
        filename: `${fullOutputPath}/theme.xaml`,
        contents: baseContent,
      }];

      // Processing mode-specific themes
      allModes.forEach(mode => {
        const modeOutputs = createResourceDictionaryForMode(tokens, excludePatterns, mode, fullOutputPath);
        outputs.push(...modeOutputs);
      });

      return outputs;
    }
  };
}




function detectAllModes(tokens) {
  const modeSet = new Set();
  tokens.forEach(token => {
    if (token.$extensions && token.$extensions.mode) {
      Object.keys(token.$extensions.mode).forEach(mode => modeSet.add(mode));
    }
  });
  return Array.from(modeSet);
}

function createResourceDictionary(tokens, excludePatterns, convertFunction) {
  // Initial XAML content with namespace declarations
  let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                      xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n`;

  // Filtering tokens based on exclude patterns
  const filteredTokens = tokens.filter(token => 
      !excludePatterns.some(pattern => new RegExp(pattern).test(token.id)));

  // Grouping tokens by type and generating XAML entries
  const groupedTokens = groupTokensByType(filteredTokens);
  for (const [type, tokensOfType] of Object.entries(groupedTokens)) {
    xamlContent += `\n  <!-- ${type.toUpperCase()} Tokens -->\n`;
    xamlContent += tokensOfType.map(token => convertFunction(token)).join("");
    xamlContent += "\n";
  }

  xamlContent += "\n</ResourceDictionary>";
  return xamlContent;
}

// Function to handle mode-specific resource dictionaries
function createResourceDictionaryForMode(tokens, excludePatterns, mode, outputDirectory) {
  const groupedTokens = groupTokensByCollectionAndMode(tokens, mode, excludePatterns);

  return Object.entries(groupedTokens).map(([collectionName, tokensOfCollection]) => {
    let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n`;

    xamlContent += tokensOfCollection.map(token => convertTokenToMAUI(token)).join("");
    xamlContent += "</ResourceDictionary>";

    return {
      filename: `${outputDirectory}/theme.${collectionName}.${mode}.xaml`,
      contents: xamlContent,
    };
  });
}


function groupTokensByCollectionAndMode(tokens, mode, excludePatterns) {
  return tokens
    .filter(token =>
      token.$extensions &&
      token.$extensions.mode &&
      token.$extensions.mode[mode] &&
      !excludePatterns.some(pattern => new RegExp(pattern).test(token.id))
    )
    .reduce((acc, token) => {
      const collectionName = token.$extensions.figma.collection.name;
      const modeToken = {
        ...token,
        $value: token.$extensions.mode[mode],
      };

      if (!acc[collectionName]) {
        acc[collectionName] = [];
      }
      acc[collectionName].push(modeToken);
      return acc;
    }, {});
}


function convertTokenToMAUI(token, mode = null) {
  let xaml = '';
  let value = mode && token.$extensions && token.$extensions.mode && token.$extensions.mode[mode]
              ? token.$extensions.mode[mode]
              : token.$value; // Use the default $value if no mode-specific value is provided

  switch (token.$type) {
      case 'color':
          xaml = `  <Color x:Key="${token.id}">${value}</Color>\n`;
          break;
      case 'dimension':
          xaml = `  <sys:Double x:Key="${token.id}">${parseDimension(value)}</sys:Double>\n`;
          break;
      case 'shadow':
          xaml = convertShadowToMAUI(token, value) + '\n';
          break;
      case 'typography':
          xaml = convertTypographyToXAML(token, value) + '\n';
          break;
  }

  return xaml;
}

function convertShadowToMAUI(token, value) {
  const shadowCount = value.length;
  return value.map((shadow, index) => {
      const key = shadowCount > 1 ? `${token.id}-${index + 1}` : token.id;
      return `  <Shadow x:Key="${key}" Color="${shadow.color}" Radius="${parseDimension(shadow.blur)}" Opacity="1" OffsetX="${parseDimension(shadow.offsetX)}" OffsetY="${parseDimension(shadow.offsetY)}"/>`;
  }).join("\n") + "\n";
}

function groupTokensByType(tokens) {
  return tokens.reduce((acc, token) => {
    const type = token.$type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(token);
    return acc;
  }, {});
}


function convertTypographyToXAML(token, value) {
  return `
<Style x:Key="${token.id}" TargetType="Label">
  <Setter Property="FontFamily" Value="${value.fontFamily}" />
  <Setter Property="FontSize" Value="${parseDimension(value.fontSize)}" />
  <Setter Property="FontWeight" Value="${value.fontWeight}" />
  <Setter Property="LineHeight" Value="${parseDimension(value.lineHeight)}" />
  <Setter Property="CharacterSpacing" Value="${parseLetterSpacing(value.letterSpacing)}" />
  <Setter Property="TextDecorations" Value="${value.textDecoration === 'NONE' ? 'None' : value.textDecoration}" />
  <Setter Property="TextTransform" Value="${convertTextCase(value.textCase)}" />
</Style>\n`;
}

function parseDimension(value) {
  return value.replace('px', '');
}

function parseLetterSpacing(value) {
  return value.endsWith('%') ? parseFloat(value) * 10 : value;
}

function convertTextCase(textCase) {
  switch(textCase) {
    case 'UPPERCASE': return 'Upper';
    case 'LOWERCASE': return 'Lower';
    case 'CAPITALIZE': return 'Capitalize';
    default: return 'None';
  }
}
