import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

async function analyzeScreenshot(imagePath, outputReportPath) {
    console.log(`Reading image: ${imagePath}`);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const prompt = `Analyze this screenshot of a technology blog website (technova.buzz). Provide a structured visual analysis report covering:
1. Overall layout and visual hierarchy.
2. Color scheme and typography.
3. Header, navigation, and main content areas.
4. Visual elements (images, buttons, spacing).
5. Potential rendering issues or visual inconsistencies.
6. Overall aesthetic impression and professionalism.

Return the analysis as a structured JSON object with the following fields:
- layoutDescription: string describing layout structure
- colorScheme: string describing colors
- typography: string describing fonts
- headerAnalysis: string
- contentAreas: string
- visualElements: string
- issues: array of strings describing potential problems
- aestheticScore: number from 1-10
- recommendations: array of strings with improvement suggestions
`;
    
    const requestBody = {
        model: 'qwen3-vl:235b-cloud',
        messages: [
            {
                role: 'user',
                content: prompt,
                images: [base64Image]
            }
        ],
        stream: false,
        options: {
            temperature: 0.2
        }
    };
    
    console.log('Sending request to Ollama vision API...');
    try {
        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        const data = await response.json();
        console.log('Analysis received.');
        
        // Try to parse JSON from response
        let analysisText = data.message?.content || data.response || JSON.stringify(data);
        let analysisJson = null;
        
        // Try to extract JSON if wrapped in markdown
        const jsonMatch = analysisText.match(/\\{.*\\}/s);
        if (jsonMatch) {
            try {
                analysisJson = JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.warn('Could not parse JSON from response, using raw text');
            }
        }
        
        const report = {
            timestamp: new Date().toISOString(),
            imageFile: path.basename(imagePath),
            analysis: analysisJson || analysisText,
            rawResponse: data
        };
        
        fs.writeFileSync(outputReportPath, JSON.stringify(report, null, 2));
        console.log(`Report saved to: ${outputReportPath}`);
        return report;
        
    } catch (error) {
        console.error('Error analyzing screenshot:', error);
        const errorReport = {
            timestamp: new Date().toISOString(),
            imageFile: path.basename(imagePath),
            error: error.message,
            stack: error.stack
        };
        fs.writeFileSync(outputReportPath, JSON.stringify(errorReport, null, 2));
        throw error;
    }
}

// Main execution
if (process.argv[1] === import.meta.url.substring(7) || process.argv[1] === import.meta.filename) {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log('Usage: node visual_analysis_esm.js <image-path> [output-report-path]');
        process.exit(1);
    }
    
    const imagePath = args[0];
    const outputPath = args[1] || path.join(
        path.dirname(imagePath),
        `analysis_${path.basename(imagePath, path.extname(imagePath))}_${Date.now()}.json`
    );
    
    analyzeScreenshot(imagePath, outputPath)
        .then(() => {
            console.log('Analysis completed successfully.');
            process.exit(0);
        })
        .catch(err => {
            console.error('Analysis failed:', err);
            process.exit(1);
        });
}

export { analyzeScreenshot };
