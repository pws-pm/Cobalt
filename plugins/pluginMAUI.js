/**
 * pluginMAUI Configuration Options
 * 
 * This plugin generates a XAML ResourceDictionary from design tokens.
 * It will generate a theme.xaml file with all tokens at their default values,
 * for token collections with more than one mode it will generate additional files per each collection mode to be used as overrides.
 * 
 * The plugin supports an optional 'excludePatterns' parameter to exclude tokens based on their IDs. 
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
import path from 'path';
import fs from 'fs';

// Ensure directory existence
function ensureDirectoryExistence(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Main plugin function
export default function pluginMAUI(options = {}) {
    const { excludePatterns = [], outputDirectory = "./", filename = "variables.xaml" } = options;
    // Adjust the output directory to include any path specified in the filename
    const fullPath = path.join(outputDirectory, filename);
    const resolvedOutputDir = path.dirname(fullPath);
    const finalFilename = path.basename(filename);

    ensureDirectoryExistence(resolvedOutputDir); // Ensure the directory exists

    return {
        name: "pluginMAUI",

        async build({ tokens, rawSchema }) {
            try {
                const allModes = detectAllModes(tokens);

                let baseContent = createResourceDictionary(tokens, excludePatterns, convertTokenToMAUI);
                const outputs = [{
                    filename: path.join(resolvedOutputDir, finalFilename),
                    contents: baseContent,
                }];

                allModes.forEach(mode => {
                    const modeOutputs = createResourceDictionaryForMode(tokens, excludePatterns, mode, resolvedOutputDir, finalFilename);
                    outputs.push(...modeOutputs);
                });

                return outputs;
            } catch (error) {
                console.error("Error in build process:", error);
                throw error;
            }
        }
    };
}

// Detect all modes available in the tokens
function detectAllModes(tokens) {
    const modeSet = new Set();
    tokens.forEach(token => {
        if (token.$extensions && token.$extensions.mode) {
            Object.keys(token.$extensions.mode).forEach(mode => modeSet.add(mode));
        }
    });
    return Array.from(modeSet);
}

// Create the base resource dictionary
function createResourceDictionary(tokens, excludePatterns, convertFunction) {
    let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n`;

    const filteredTokens = tokens.filter(token =>
        !excludePatterns.some(pattern => new RegExp(pattern).test(token.id)));

    const groupedTokens = groupTokensByType(filteredTokens);

    for (const [type, tokensOfType] of Object.entries(groupedTokens)) {
        xamlContent += `\n  <!-- ${type.toUpperCase()} Tokens -->\n`;
        xamlContent += tokensOfType.map(token => convertFunction(token)).join("");
        xamlContent += "\n";
    }

    xamlContent += "</ResourceDictionary>";
    return xamlContent;
}

// Mode-specific resource dictionary creation
function createResourceDictionaryForMode(tokens, excludePatterns, mode, outputDirectory, baseFilename) {
    const groupedTokens = groupTokensByCollectionAndMode(tokens, mode, excludePatterns);
    const baseFilenameWithoutExtension = path.basename(baseFilename, path.extname(baseFilename));

    return Object.entries(groupedTokens).map(([collectionName, tokensOfCollection]) => {
        let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                            xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">\n`;

        xamlContent += tokensOfCollection.map(token => convertTokenToMAUI(token)).join("");
        xamlContent += "</ResourceDictionary>";

        const modeFilename = `${baseFilenameWithoutExtension}.${collectionName}.${mode}.xaml`;
        const modeFullOutputPath = path.join(outputDirectory, modeFilename);
        ensureDirectoryExistence(path.dirname(modeFullOutputPath));

        return {
            filename: modeFullOutputPath,
            contents: xamlContent,
        };
    });
}

// Group tokens by type
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

// Convert a token to the MAUI XAML format
function convertTokenToMAUI(token) {
    let xaml = '';
    let value = token.$value;

    switch (token.$type) {
        case 'color':
            xaml = `  <Color x:Key="${token.id}">${value}</Color>\n`;
            break;
        case 'dimension':
            xaml = `  <sys:Double x:Key="${token.id}">${parseDimension(value)}</sys:Double>\n`;
            break;
        case 'shadow':
            xaml = `  <Shadow x:Key="${token.id}" Color="${value.color}" Radius="${parseDimension(value.blur)}" Opacity="${value.opacity}" OffsetX="${parseDimension(value.offsetX)}" OffsetY="${parseDimension(value.offsetY)}"/>\n`;
            break;
        case 'typography':
            xaml = `  <Style x:Key="${token.id}" TargetType="Label">
                          <Setter Property="FontFamily" Value="${value.fontFamily}" />
                          <Setter Property="FontSize" Value="${parseDimension(value.fontSize)}" />
                          <Setter Property="FontWeight" Value="${value.fontWeight}" />
                          <Setter Property="LineHeight" Value="${parseDimension(value.lineHeight)}" />
                          <Setter Property="CharacterSpacing" Value="${parseLetterSpacing(value.letterSpacing)}" />
                          <Setter Property="TextDecorations" Value="${value.textDecoration}" />
                          <Setter Property="TextTransform" Value="${convertTextCase(value.textCase)}" />
                      </Style>\n`;
            break;
    }

    return xaml;
}

// Parse dimensions and convert to XAML-friendly format
function parseDimension(value) {
    return value.replace('px', '');
}

// Convert letter spacing to XAML format
function parseLetterSpacing(value) {
    return value.endsWith('%') ? parseFloat(value) * 10 : value.replace('px', '');
}

// Convert text case to XAML format
function convertTextCase(textCase) {
    switch (textCase) {
        case 'UPPERCASE':
            return 'Upper';
        case 'LOWERCASE':
            return 'Lower';
        case 'CAPITALIZE':
            return 'Capitalize';
        default:
            return 'None';
    }
}