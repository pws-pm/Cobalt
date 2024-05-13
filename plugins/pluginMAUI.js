/**
 * Version 1.03
 * 
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
  let xamlOutput = [];

  // Determine if the shadows are inset based on any shadow's inset property in the group
  const isInsetGroup = value.some(shadow => shadow.inset);

  // General group comment with application and Z-index information, specific to shadow type
  if (isInsetGroup) {
    xamlOutput.push(`  <!-- Inset shadows for ${token.id}. All tokens in this group should be used together. Apply using clipped borders inside the main component. Ensure the Z-index is set higher so shadows are visible within the component content. -->`);
  } else {
    xamlOutput.push(`  <!-- Drop shadows for ${token.id}. All tokens in this group should be used together. Apply using separate Frames behind the main component. Ensure the Z-index is set lower so shadows appear behind the component content. -->`);
  }

  value.forEach((shadow, index) => {
    const key = shadowCount > 1 ? `${token.id}-${index + 1}` : token.id;
    const margin = parseFloat(shadow.spread.replace('px', ''));

    // Shadow element with minimal key-specific instructions
    xamlOutput.push(`  <Shadow x:Key="${key}" Color="${shadow.color}" Radius="${parseDimension(shadow.blur)}" Opacity="1" OffsetX="${parseDimension(shadow.offsetX)}" OffsetY="${parseDimension(shadow.offsetY)}"/>`);
    if (!shadow.inset) {
      // Only add margin details for drop shadows
      xamlOutput.push(`  <!-- Frame for drop shadow (Key: ${key}) should have a Margin="${margin},${margin},${margin},${margin}" relative to the main component. -->`);
    }
  });

  return xamlOutput.join("\n") + "\n";
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

function convertFontWeight(weight) {
  // List of valid font weight names supported by MAUI
  const validFontWeights = ["Thin", "ExtraLight", "Light", "Regular", "Medium", "SemiBold", "Bold", "ExtraBold", "Black"];

  if (typeof weight === 'string') {
      // Normalize the input string
      let normalizedWeight = weight.replace(/\s/g, '').charAt(0).toUpperCase() + weight.replace(/\s/g, '').slice(1).toLowerCase();

      // Check if the normalized font weight is valid
      if (validFontWeights.includes(normalizedWeight)) {
          return normalizedWeight;
      } else {
          console.log(`Unsupported fontWeight '${weight}', defaulting to 'Regular'.`);
          return "Regular";
      }
  }

  // Map numeric fontWeight values to MAUI named equivalents
  switch (weight) {
      case 100: return "Thin";
      case 200: return "ExtraLight";
      case 300: return "Light";
      case 400: return "Regular";
      case 500: return "Medium";
      case 600: return "SemiBold";
      case 700: return "Bold";
      case 800: return "ExtraBold";
      case 900: return "Black";
      default:
          console.log(`Unexpected fontWeight value '${weight}', defaulting to 'Regular'.`);
          return "Regular";  // Default or fallback to regular if unknown
  }
}


function convertTypographyToXAML(token, value) {
  const fontSizePx = parseFloat(value.fontSize.replace('px', '')); // Extract numeric part from fontSize

  return `
<Style x:Key="${token.id}" TargetType="Label">
<Setter Property="FontFamily" Value="${value.fontFamily}" />
<Setter Property="FontSize" Value="${parseDimension(value.fontSize)}" />
<Setter Property="FontWeight" Value="${convertFontWeight(value.fontWeight)}" />
<Setter Property="LineHeight" Value="${parseDimension(value.lineHeight)}" />
<Setter Property="CharacterSpacing" Value="${parseLetterSpacing(value.letterSpacing, fontSizePx)}" />
<Setter Property="TextDecorations" Value="${value.textDecoration === 'NONE' ? 'None' : value.textDecoration}" />
<Setter Property="TextTransform" Value="${convertTextCase(value.textCase)}" />
</Style>\n`;
}


function parseDimension(value) {
  if (typeof value !== 'string' || !value.endsWith('px')) {
      console.error(`Invalid dimension value: ${value}. Expected a string ending with 'px'.`);
      return '16'; // Default to '16' if input is not as expected
  }
  return value.replace('px', '');
}


function parseLetterSpacing(letterSpacing, fontSize) {
  if (typeof letterSpacing === 'string') {
      if (letterSpacing.endsWith('%')) {
          // Convert from percentage of the font size to em
          const percentage = parseFloat(letterSpacing) / 100;
          const letterSpacingEm = (percentage * fontSize);
          return Math.round(letterSpacingEm / fontSize * 1000); // Convert to MAUI's unit
      } else if (letterSpacing.endsWith('px')) {
          // Direct conversion from pixels to em
          const letterSpacingPx = parseFloat(letterSpacing);
          return Math.round(letterSpacingPx / fontSize * 1000); // Convert to MAUI's unit
      }
  }
  console.error(`Invalid letterSpacing value: ${letterSpacing}. Expected a string with 'px' or '%'.`);
  return 0; // Default value if parsing fails
}



function convertTextCase(textCase) {
  switch(textCase.toUpperCase()) { // Ensure the case is not sensitive
      case 'UPPERCASE': return 'Upper';
      case 'LOWERCASE': return 'Lower';
      case 'CAPITALIZE': return 'Capitalize';
      default:
          console.log(`Unexpected text case value '${textCase}', defaulting to 'None'.`);
          return 'None'; // Default if no known case is matched
  }
}