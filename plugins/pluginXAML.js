export default function pluginXAML(options = {}) {
    return {
      name: "pluginXAML",
  
      async build({ tokens, rawSchema }) {
        // Start with the opening tag of the ResourceDictionary
        let xamlContent = `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                          xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
                          xmlns:sys="clr-namespace:System;assembly=mscorlib">\n`;
  
        // Convert tokens to XAML content
        xamlContent += tokens.map(token => convertTokenToXAML(token)).join("\n");
  
        // Close the ResourceDictionary tag
        xamlContent += "\n</ResourceDictionary>";
  
        // Return the output as a XAML file
        return [
          {
            filename: options.filename || "default.xaml",
            contents: xamlContent,
          }
        ];
      }
    };
  }
  
  // Helper function to convert a token to XAML format
  function convertTokenToXAML(token) {
    let xaml = '';
  
    switch (token.$type) {
      case 'color':
        xaml = `  <Color x:Key="${token.id}">${token.$value}</Color>`;
        break;
      case 'dimension':
        xaml = `  <Double x:Key="${token.id}">${token.$value}</Double>`;
        break;
      // Add more cases as necessary for other token types
    }
  
    return xaml;
  }
  