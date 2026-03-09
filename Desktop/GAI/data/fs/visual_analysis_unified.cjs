const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Unified Visual Analysis Function
 * Provides capabilities for analyzing websites, images, and videos using AI vision models.
 * 
 * Capabilities:
 * 1. Website Analysis: Capture screenshot with Puppeteer, then analyze with AI vision.
 * 2. Image Analysis: Direct analysis of existing images.
 * 3. Video Analysis: Extract key frames with FFmpeg, then analyze frames.
 * 
 * Dependencies:
 * - Puppeteer (for website screenshots)
 * - FFmpeg (for video frame extraction)
 * - Ollama with vision model (e.g., qwen3-vl:235b-cloud)
 */

/**
 * Capture a screenshot of a website using Puppeteer.
 * @param {string} url - Website URL.
 * @param {string} outputPath - Path to save screenshot (PNG).
 * @param {object} options - Optional Puppeteer options (viewport, waitUntil, etc.).
 * @returns {Promise<string>} Path to saved screenshot.
 */
async function captureWebsiteScreenshot(url, outputPath, options = {}) {
    const puppeteer = require('puppeteer');
    
    const defaultOptions = {
        viewport: { width: 1920, height: 1080 },
        waitUntil: 'networkidle2',
        timeout: 30000,
        fullPage: true
    };
    const opts = { ...defaultOptions, ...options };
    
    console.log(`Launching browser for ${url}...`);
    const browser = await puppeteer.launch({ headless: 'new' });
    try {
        const page = await browser.newPage();
        await page.setViewport(opts.viewport);
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: opts.waitUntil, timeout: opts.timeout });
        // Wait a bit for any dynamic content
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`Capturing screenshot to ${outputPath}...`);
        await page.screenshot({ path: outputPath, fullPage: opts.fullPage });
        console.log('Screenshot saved.');
        return outputPath;
    } finally {
        await browser.close();
    }
}

/**
 * Extract key frames from a video using FFmpeg.
 * @param {string} videoPath - Path to video file.
 * @param {string} outputDir - Directory to save extracted frames.
 * @param {object} options - FFmpeg options (frame count, interval, etc.).
 * @returns {Promise<string[]>} Array of paths to extracted frame images.
 */
async function extractVideoFrames(videoPath, outputDir, options = {}) {
    const defaultOptions = {
        frameCount: 5,          // extract N frames evenly spaced
        format: 'jpg',
        quality: 2              // FFmpeg quality scale (2 is good)
    };
    const opts = { ...defaultOptions, ...options };
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get video duration using FFmpeg
    const { stdout: durationOut } = await execPromise(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`);
    const duration = parseFloat(durationOut.trim());
    
    if (isNaN(duration) || duration <= 0) {
        throw new Error(`Could not get video duration for ${videoPath}`);
    }
    
    const interval = duration / (opts.frameCount + 1); // avoid first/last second
    const framePaths = [];
    
    for (let i = 1; i <= opts.frameCount; i++) {
        const timestamp = interval * i;
        const framePath = path.join(outputDir, `frame_${i}_${Math.round(timestamp)}s.${opts.format}`);
        // Extract frame at timestamp
        await execPromise(`ffmpeg -ss ${timestamp} -i "${videoPath}" -frames:v 1 -q:v ${opts.quality} "${framePath}" -y`);
        if (fs.existsSync(framePath)) {
            framePaths.push(framePath);
        }
    }
    
    console.log(`Extracted ${framePaths.length} frames from video.`);
    return framePaths;
}

/**
 * Analyze an image using Ollama vision API.
 * @param {string} imagePath - Path to image file.
 * @param {object} analysisOptions - Analysis prompt and model settings.
 * @returns {Promise<object>} Analysis report.
 */
async function analyzeImageWithAI(imagePath, analysisOptions = {}) {
    const defaultOptions = {
        model: process.env.VISION_MODEL || 'llava:latest',
        prompt: `Analyze this image. Provide a structured visual analysis report covering:
1. Overall composition and subject.
2. Colors, lighting, and mood.
3. Key objects and their arrangement.
4. Any text or logos present.
5. Overall aesthetic impression and quality.

Return the analysis as a structured JSON object with the following fields:
- description: string describing the image
- colors: string describing colors
- lighting: string describing lighting
- objects: array of strings describing key objects
- text: array of strings of any text present
- aestheticScore: number from 1-10
- tags: array of relevant tags
`,
        temperature: 0.2
    };
    const opts = { ...defaultOptions, ...analysisOptions };
    
    // If specific model is requested via options, use it. Otherwise use env var or default.
    // Allow dynamic model selection by the Brain
    const selectedModel = opts.model; 
    console.log(`Using vision model: ${selectedModel}`);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const requestBody = {
        model: selectedModel,
        messages: [
            {
                role: 'user',
                content: opts.prompt,
                images: [base64Image]
            }
        ],
        stream: false,
        options: {
            temperature: opts.temperature
        }
    };
    
    console.log('Sending request to Ollama vision API...');
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
    
    const jsonMatch = analysisText.match(/\{.*\}/s);
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
    
    return report;
}

/**
 * Unified visual analysis function.
 * @param {string} target - URL, image path, or video path.
 * @param {string} outputDir - Directory to save outputs (screenshots, frames, reports).
 * @param {object} options - Type-specific options.
 * @returns {Promise<object>} Comprehensive analysis report.
 */
async function visualAnalysis(target, outputDir, options = {}) {
    const startTime = Date.now();
    const report = {
        timestamp: new Date().toISOString(),
        target,
        type: null,
        outputs: [],
        analysis: null,
        durationMs: 0
    };
    
    // Determine type
    let type = 'unknown';
    if (target.startsWith('http://') || target.startsWith('https://')) {
        type = 'website';
    } else {
        const ext = path.extname(target).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
            type = 'image';
        } else if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) {
            type = 'video';
        }
    }
    report.type = type;
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    try {
        if (type === 'website') {
            // Capture screenshot
            const screenshotPath = path.join(outputDir, `screenshot_${Date.now()}.png`);
            const screenshot = await captureWebsiteScreenshot(target, screenshotPath, options.screenshotOptions);
            report.outputs.push({ type: 'screenshot', path: screenshot });
            // Analyze screenshot
            const analysis = await analyzeImageWithAI(screenshot, options.analysisOptions);
            report.analysis = analysis;
        } else if (type === 'image') {
            // Direct analysis
            const analysis = await analyzeImageWithAI(target, options.analysisOptions);
            report.outputs.push({ type: 'image', path: target });
            report.analysis = analysis;
        } else if (type === 'video') {
            // Extract frames
            const framesDir = path.join(outputDir, 'frames');
            const frames = await extractVideoFrames(target, framesDir, options.frameOptions);
            report.outputs.push({ type: 'frames', count: frames.length, directory: framesDir });
            // Analyze each frame
            const frameAnalyses = [];
            for (const frame of frames.slice(0, 3)) { // limit to first 3 frames for speed
                const analysis = await analyzeImageWithAI(frame, options.analysisOptions);
                frameAnalyses.push({
                    frame,
                    analysis
                });
            }
            report.analysis = frameAnalyses;
        } else {
            throw new Error(`Unsupported target type: ${target}`);
        }
    } catch (error) {
        report.error = {
            message: error.message,
            stack: error.stack
        };
        throw error;
    } finally {
        report.durationMs = Date.now() - startTime;
    }
    
    // Save report
    const reportPath = path.join(outputDir, `visual_analysis_report_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to: ${reportPath}`);
    
    return report;
}

// Export functions for module usage
module.exports = {
    visualAnalysis,
    captureWebsiteScreenshot,
    extractVideoFrames,
    analyzeImageWithAI
};

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: node visual_analysis_unified.js <target> <outputDir> [optionsJSON]');
        console.log('Example 1 (website): node visual_analysis_unified.js https://technova.buzz ./analysis');
        console.log('Example 2 (image): node visual_analysis_unified.js ./image.jpg ./analysis');
        console.log('Example 3 (video): node visual_analysis_unified.js ./video.mp4 ./analysis');
        process.exit(1);
    }
    
    const target = args[0];
    const outputDir = args[1];
    const options = args[2] ? JSON.parse(args[2]) : {};
    
    visualAnalysis(target, outputDir, options)
        .then(report => {
            console.log('Visual analysis completed successfully.');
            console.log(`Type: ${report.type}, Duration: ${report.durationMs}ms`);
            process.exit(0);
        })
        .catch(err => {
            console.error('Visual analysis failed:', err);
            process.exit(1);
        });
}
