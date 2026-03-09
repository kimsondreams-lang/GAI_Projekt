import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function validateAll() {
    console.log('=== GAI OS QUALITY GATE ===');
    let passed = true;

    try {
        console.log('1. Running Visual & Link Integrity Audit...');
        execSync('node scripts/visual_audit.js', { stdio: 'inherit' });
        console.log('✅ Visual Audit Passed');
    } catch (e) {
        console.error('❌ Visual Audit Failed');
        passed = false;
    }

    try {
        console.log('2. Checking for hardcoded localhost/3000 in public...');
        const grep = execSync('grep -r "localhost:3000" public || true').toString();
        if (grep.trim()) {
            console.error('❌ Found hardcoded localhost references:\n' + grep);
            passed = false;
        } else {
            console.log('✅ No hardcoded localhost found');
        }
    } catch (e) {
        passed = false;
    }

    if (passed) {
        console.log('=== QUALITY GATE PASSED ===');
        process.exit(0);
    } else {
        console.log('=== QUALITY GATE FAILED ===');
        process.exit(1);
    }
}

validateAll();
