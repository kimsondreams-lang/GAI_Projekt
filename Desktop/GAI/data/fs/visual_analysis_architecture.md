# Visual Analysis Function Architecture

## Overview
A unified function `visualAnalyze(target, options)` that can analyze websites, images, and videos using AI vision models. The function integrates existing modules: screenshot capture (Puppeteer), image analysis (Ollama vision API), and optional video frame extraction (FFmpeg).

## Modules

### 1. Screenshot Capture (`capture.js`)
- Uses Puppeteer (already in package.json).
- Supports viewport customization, full‑page capture, wait times.
- Returns screenshot file path.
- Existing code: `analiza_wizualna/capture_screenshot.cjs`.

### 2. Image Analysis (`analyze.js`)
- Takes image path (or base64) and sends to Ollama vision API (qwen3‑vl:235b‑cloud).
- Returns structured JSON report: layout, colors, typography, issues, aesthetic score, recommendations.
- Existing code: `data/fs/visual_analysis.js` (CommonJS) and `data/fs/visual_analysis_esm.js` (ESM).

### 3. Video Frame Extraction (`video.js`)
- Optional module using FFmpeg (via fluent‑ffmpeg) to extract key frames.
- Can analyze each frame or sample frames.
- Returns aggregated analysis.

### 4. Unified API (`visual_analysis_unified.js`)
```javascript
async function visualAnalyze(target, options = {}) {
    // target can be: URL, image file path, video file path
    // options: type, viewport, model, outputDir, waitTime, etc.
    // Returns: { type, timestamp, analysis, reportPath, screenshotPath? }
}
```

## Integration with GAIOS
- Function available in `data/fs/visual_analysis_unified.js` as CommonJS module (compatible with Node.js).
- Can be called via `PYTHON_EXEC` (using child_process) or `SHELL` (node script).
- Use for UX/UI evaluation, image selection, website debugging, visual quality audits.

## Dependencies
- puppeteer (already in package.json)
- node‑fetch (already)
- fluent‑ffmpeg (optional, for video)
- Ollama with vision model (qwen3‑vl:235b‑cloud) running on localhost:11434

## Example Usage
```javascript
const { visualAnalyze } = require('./visual_analysis_unified');
const report = await visualAnalyze('https://technova.buzz', { type: 'website' });
console.log(report.analysis.aestheticScore);
```

## Error Handling
- Timeouts for network requests.
- Fallback to raw text if JSON parsing fails.
- Graceful degradation when video module not available.

## Output Format
```json
{
  "type": "website|image|video",
  "timestamp": "2026‑03‑07T17:50:05.169Z",
  "target": "https://technova.buzz",
  "screenshotPath": "/path/to/screenshot.png",
  "analysis": {
    "layoutDescription": "...",
    "colorScheme": "...",
    "typography": "...",
    "issues": ["...", "..."],
    "aestheticScore": 8.5,
    "recommendations": ["...", "..."]
  },
  "reportPath": "/path/to/report.json"
}
```

## Next Steps
1. Implement `visual_analysis_unified.js` that wraps capture and analysis.
2. Add video frame extraction (optional).
3. Test with real targets.
4. Create CLI wrapper for easy invocation from GAIOS tools.
5. Document usage in GAIOS workflow.
