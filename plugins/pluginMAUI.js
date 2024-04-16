/**
 * pluginMAUI Configuration Options
 * 
 * This plugin generates a XAML ResourceDictionary from design tokens. It supports an optional
 * 'excludePatterns' parameter to exclude tokens based on their IDs. 
 *
 * Usage:
 * The 'excludePatterns' parameter accepts an array of string patterns. Each string is a regular 
 * expression that is tested against the token IDs. Any token whose ID matches any of the provided 
 * patterns will be excluded from the output.
 *
 * Example Configuration to exclude tokens that start with 'colorbase' or end with 'temporary':
 *
 * import pluginMAUI from "./plugins/pluginMAUI.js";
 *
 * export default {
 *   plugins: [
 *     pluginMAUI({
 *       filename: "theme.xaml", // Specify the output filename
 *       excludePatterns: ["^colorbase", "temporary$"]
 *     }),
 *   ],
 * };
 */



export default function pluginMAUI(options = {}) {
  const { excludePatterns = [] } = options;  // Default to no exclusions if none provided

  return {
    name: "pluginMAUI",

    async build({ tokens, rawSchema }) {
      let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n`;

      // Filter tokens based on excludePatterns before grouping them
      const filteredTokens = tokens.filter(token => !excludePatterns.some(pattern => new RegExp(pattern).test(token.id)));

      // Group tokens by type to separate them in the output with comments
      const groupedTokens = groupTokensByType(filteredTokens);

      // Iterate over grouped tokens and append them with type comments and separations
      for (const [type, tokensOfType] of Object.entries(groupedTokens)) {
        xamlContent += `\n  <!-- ${type.toUpperCase()} Tokens -->\n`;
        xamlContent += tokensOfType.map(token => convertTokenToMAUI(token)).join("\n") + "\n";
      }

      xamlContent += "</ResourceDictionary>";

      return [
        {
          filename: options.filename || "default.xaml",
          contents: xamlContent,
        }
      ];
    }
  };
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

function convertTokenToMAUI(token) {
  let xaml = '';

  switch (token.$type) {
    case 'color':
      xaml = `  <Color x:Key="${token.id}">${token.$value}</Color>`;
      break;
    case 'dimension':
      xaml = `  <sys:Double x:Key="${token.id}">${token.$value}</sys:Double>`;
      break;
    case 'shadow':
      xaml += convertShadowToMAUI(token);
      break;
    case 'typography':
      xaml += convertTypographyToXAML(token);
      break;
  }

  return xaml;
}

function convertShadowToMAUI(token) {
  const shadowCount = token.$value.length;
  return token.$value.map((shadow, index) => {
    const key = shadowCount > 1 ? `${token.id}-${index + 1}` : token.id;
    return `  <Shadow x:Key="${key}" Color="${shadow.color}" Radius="${parseDimension(shadow.blur)}" Opacity="1" OffsetX="${parseDimension(shadow.offsetX)}" OffsetY="${parseDimension(shadow.offsetY)}"/>`;
  }).join("\n  ");
}

function convertTypographyToXAML(token) {
  const { fontFamily, fontWeight, fontSize, lineHeight, letterSpacing, textDecoration, textCase } = token.$value;
  return `
  <Style x:Key="${token.id}" TargetType="Label">
    <Setter Property="FontFamily" Value="${fontFamily}" />
    <Setter Property="FontSize" Value="${parseDimension(fontSize)}" />
    <Setter Property="FontWeight" Value="${fontWeight}" />
    <Setter Property="LineHeight" Value="${parseDimension(lineHeight)}" />
    <Setter Property="CharacterSpacing" Value="${parseLetterSpacing(letterSpacing)}" />
    <Setter Property="TextDecorations" Value="${textDecoration === 'NONE' ? 'None' : textDecoration}" />
    <Setter Property="TextTransform" Value="${convertTextCase(textCase)}" />
  </Style>`;
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
