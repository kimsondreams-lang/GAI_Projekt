// Image Optimization Script for GAI Blog
// Compresses images larger than 500KB to optimize web performance

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IMAGES_DIR = '/Users/jakubnetza/Desktop/GAI/public/images/articles';
const MAX_SIZE_KB = 500;
const QUALITY = 85;
const MAX_WIDTH = 1920;

// Find large images
function findLargeImages() {
    const files = fs.readdirSync(IMAGES_DIR);
    const largeImages = [];
    
    files.forEach(file => {
        const filePath = path.join(IMAGES_DIR, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        
        if (sizeKB > MAX_SIZE_KB) {
            largeImages.push({
                path: filePath,
                sizeKB: sizeKB,
                name: file
            });
        }
    });
    
    return largeImages.sort((a, b) => b.sizeKB - a.sizeKB);
}

// Optimize single image using sips (macOS built-in)
function optimizeImage(imagePath, sizeKB) {
    const name = path.basename(imagePath);
    console.log('Optimizing: ' + name + ' (' + sizeKB + 'KB)...');
    
    try {
        const tempPath = imagePath.replace('.jpg', '_opt.jpg');
        execSync('sips -Z ' + QUALITY + ' --resampleWidth ' + MAX_WIDTH + ' --out ' + tempPath + ' ' + imagePath + '', { stdio: 'inherit' });
        fs.unlinkSync(imagePath);
        fs.renameSync(tempPath, imagePath);
        
        const newStats = fs.statSync(imagePath);
        const newSizeKB = Math.round(newStats.size / 1024);
        console.log('  Done: ' + newSizeKB + 'KB (saved ' + (sizeKB - newSizeKB) + 'KB)');
        
        return { success: true, newSizeKB, savedKB: sizeKB - newSizeKB };
    } catch (err) {
        console.error('  Error: ' + err.message);
        return { success: false, error: err.message };
    }
}

// Main execution
console.log('=== GAI Image Optimizer ===\\n');
const largeImages = findLargeImages();
console.log('Found ' + largeImages.length + ' images larger than ' + MAX_SIZE_KB + 'KB\\n');

let optimized = 0;
let failed = 0;
let totalSavedKB = 0;

largeImages.forEach(img => {
    console.log('\\nProcessing: ' + img.name);
    const result = optimizeImage(img.path, img.sizeKB);
    if (result.success) {
        optimized++;
        totalSavedKB += result.savedKB;
    } else {
        failed++;
    }
});

console.log('\\n=== Summary ===');
console.log('Optimized: ' + optimized);
console.log('Failed: ' + failed);
console.log('Total space saved: ~' + totalSavedKB + 'KB');
console.log('\\nDone!');
