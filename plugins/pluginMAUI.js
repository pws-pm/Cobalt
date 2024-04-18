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
 *       excludePatterns: ["^colorbase", "temporary$"]
 *     }),
 *   ],
 * };
 */

export default function pluginMAUI(options = {}) {
  const { excludePatterns = [], outputDirectory = "./" } = options;
  
  // Validate options structure
  if (!Array.isArray(excludePatterns) || typeof outputDirectory !== 'string') {
    throw new Error("Invalid options: 'excludePatterns' must be an array and 'outputDirectory' must be a string.");
  }

  return {
    name: "pluginMAUI",

    async build({ tokens, rawSchema }) {
      // Validate tokens array
      if (!Array.isArray(tokens)) {
        throw new Error("Invalid input: 'tokens' must be an array.");
      }

      try {
        const allModes = detectAllModes(tokens);
        const regexPatterns = excludePatterns.map(pattern => {
          try {
            return new RegExp(pattern);
          } catch (error) {
            throw new Error(`Invalid regex pattern: ${pattern}`);
          }
        });
        let baseContent = createResourceDictionary(tokens, regexPatterns, convertTokenToMAUI);
        const outputs = [{
          filename: `${outputDirectory}/theme.xaml`,
          contents: baseContent,
        }];

        allModes.forEach(mode => {
          const modeOutputs = createResourceDictionaryForMode(tokens, regexPatterns, mode, outputDirectory);
          outputs.push(...modeOutputs);
        });

        return outputs;
      } catch (error) {
        console.error("Error in build process:", error);
        throw new Error("Failed to build themes due to an internal error.");
      }
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

function createResourceDictionary(tokens, regexPatterns, convertFunction) {
  let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                      xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n`;

  const filteredTokens = tokens.filter(token => 
      !regexPatterns.some(regex => regex.test(token.id)));

  const groupedTokens = groupTokensByType(filteredTokens);
  for (const [type, tokensOfType] of Object.entries(groupedTokens)) {
    xamlContent += `\n  <!-- ${type.toUpperCase()} Tokens -->\n`;
    xamlContent += tokensOfType.map(token => convertFunction(token)).join("");
    xamlContent += "\n";
  }

  xamlContent += "\n</ResourceDictionary>";
  return xamlContent;
}

function createResourceDictionaryForMode(tokens, regexPatterns, mode, outputDirectory) {
  try {
    const groupedTokens = groupTokensByCollectionAndMode(tokens, mode, regexPatterns);
    
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
  } catch (error) {
    console.error(`Error processing mode ${mode}:`, error);
    throw new Error(`Failed to create resource dictionary for mode ${mode} due to an internal error.`);
  }
}

function groupTokensByCollectionAndMode(tokens, mode, regexPatterns) {
  return tokens
    .filter(token =>
      token.$extensions &&
      token.$extensions.mode &&
      token.$extensions.mode[mode] &&
      !regexPatterns.some(regex => regex.test(token.id))
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
