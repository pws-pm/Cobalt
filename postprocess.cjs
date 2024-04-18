const fs = require('fs');
const path = require('path');

// Path to your SCSS file
const filePath = path.join(__dirname, '_output/index.scss');

// Function to process the SCSS file
function processSCSSFile(filePath) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading the SCSS file:', err);
            return;
        }

        // Split the content by lines
        const lines = data.split('\n');
        let inColorBaseBlock = false;
        let parenthesisCount = 0;
        const filteredLines = [];

        for (const line of lines) {
            // Check if the line is the start of a colorBase token block
            if (!inColorBaseBlock && line.trim().startsWith('"colorbase')) {
                inColorBaseBlock = true;
            }

            // If inside a colorBase block, track the parentheses
            if (inColorBaseBlock) {
                // Count opening and closing parentheses
                const opening = (line.match(/\(/g) || []).length;
                const closing = (line.match(/\)/g) || []).length;
                parenthesisCount += (opening - closing);

                // Check if the block has ended
                if (parenthesisCount === 0) {
                    inColorBaseBlock = false;
                }
                continue; // Skip adding lines within the colorBase block
            }

            // Add lines that are not part of a colorBase block
            filteredLines.push(line);
        }

        // Reconstruct the SCSS content
        const filteredContent = filteredLines.join('\n');

        // Write the filtered content back to the file
        fs.writeFile(filePath, filteredContent, 'utf8', (err) => {
            if (err) {
                console.error('Error writing the SCSS file:', err);
                return;
            }
            console.log('SCSS file processed successfully.');
        });
    });
}

// Execute the processing function
processSCSSFile(filePath);
