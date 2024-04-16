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
  const { excludePatterns = [], outputDirectory = "./" } = options;

  return {
    name: "pluginMAUI",

    async build({ tokens, rawSchema }) {
      // Detect all unique modes from the tokens
      const allModes = detectAllModes(tokens);

      // Generate the main XAML content
      let baseContent = createResourceDictionary(tokens, excludePatterns, convertTokenToMAUI);
      const outputs = [{
        filename: `${outputDirectory}theme.xaml`,
        contents: baseContent,
      }];

      // Generate additional files for each detected mode
      allModes.forEach(mode => {
        const modeContent = createResourceDictionaryForMode(tokens, excludePatterns, mode);
        outputs.push({
          filename: `${outputDirectory}theme.${mode}.xaml`,
          contents: modeContent,
        });
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
  let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n`;

  const filteredTokens = tokens.filter(token => !excludePatterns.some(pattern => new RegExp(pattern).test(token.id)));
  const groupedTokens = groupTokensByType(filteredTokens);

  for (const [type, tokensOfType] of Object.entries(groupedTokens)) {
    xamlContent += `\n  <!-- ${type.toUpperCase()} Tokens -->\n`;
    xamlContent += tokensOfType.map(token => convertFunction(token)).join("\n") + "\n";
  }

  xamlContent += "</ResourceDictionary>";
  return xamlContent;
}

function createResourceDictionaryForMode(tokens, excludePatterns, mode) {
  let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                      xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n`;

  // Filter tokens for the specific mode and exclude patterns
  tokens.filter(token => 
      token.$extensions && 
      token.$extensions.mode && 
      token.$extensions.mode[mode] &&
      !excludePatterns.some(pattern => new RegExp(pattern).test(token.id))) // Apply the exclude patterns
      .forEach(token => {
          const modeToken = {
              ...token,
              $value: token.$extensions.mode[mode]
          };
          xamlContent += convertTokenToMAUI(modeToken);
      });

  xamlContent += "\n</ResourceDictionary>";
  return xamlContent;
}


function convertTokenToMAUI(token, mode = null) {
  let xaml = '';
  let value = mode && token.$extensions && token.$extensions.mode && token.$extensions.mode[mode]
              ? token.$extensions.mode[mode]
              : token.$value;

  switch (token.$type) {
      case 'color':
          xaml = `  <Color x:Key="${token.id}">${value}</Color>\n`; // Ensure newline at the end
          break;
      case 'dimension':
          xaml = `  <sys:Double x:Key="${token.id}">${parseDimension(value)}</sys:Double>\n`;
          break;
      case 'shadow':
          xaml = convertShadowToMAUI(token, value) + '\n'; // Newline after shadows
          break;
      case 'typography':
          xaml = convertTypographyToXAML(token, value) + '\n'; // Newline after typography styles
          break;
  }

  return xaml;
}

function convertShadowToMAUI(token, value) {
  const shadowCount = value.length;
  return value.map((shadow, index) => {
      const key = shadowCount > 1 ? `${token.id}-${index + 1}` : token.id;
      return `  <Shadow x:Key="${key}" Color="${shadow.color}" Radius="${parseDimension(shadow.blur)}" Opacity="1" OffsetX="${parseDimension(shadow.offsetX)}" OffsetY="${parseDimension(shadow.offsetY)}"/>`;
  }).join("\n  ") + "\n"; // Join shadows with new lines and add a newline at the end
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
