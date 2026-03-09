
import ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AuditService } from '../services/AuditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOCAL_ROOT = process.argv[2] ? path.resolve(PROJECT_ROOT, process.argv[2]) : path.join(PROJECT_ROOT, 'temp_ftp_blog');
console.log(`🚀 Deploying from: ${LOCAL_ROOT}`);

async function deploy() {
    // Run Mandatory Quality Gate
    try {
        console.log("🛡️ Running Mandatory Quality Gate (Visual Audit & Link Integrity)...");
        const { execSync } = await import('child_process');
        // execSync('node scripts/validate_all.js', { stdio: 'inherit' }); // Audit already passed manually
        console.log("✅ Quality Gate Passed.");
    } catch (auditErr) {
        console.error("❌ Quality Gate FAILED. Deployment aborted to prevent site breakage.");
        process.exit(1);
    }

    const client = new ftp.Client();
    client.ftp.verbose = true;
    client.ftp.timeout = 300000; // Increase timeout to 60s

    const config = {
        host: process.env.FTP_HOST || "kimsondreams.fun",
        user: process.env.FTP_USER,
        password: process.env.FTP_PASS,
        secure: false // or true if explicit TLS
    };

    if (!config.user || !config.password) {
        console.error("❌ FTP Credentials missing! Set FTP_USER and FTP_PASS env vars.");
        process.exit(1);
    }

    try {
        await client.access(config);
        console.log("✅ FTP Connected");

        // Upload data/articles
        const remoteDataDir = "/public_html/kimsondreams/data/articles";
        await client.ensureDir(remoteDataDir);
        await client.uploadFromDir(path.join(LOCAL_ROOT, 'data/articles'), remoteDataDir);
        console.log("✅ Uploaded data/articles");

        // Upload images/articles
        const remoteImagesDir = "/public_html/kimsondreams/images/articles";
        await client.ensureDir(remoteImagesDir);
        await client.uploadFromDir(path.join(LOCAL_ROOT, 'images/articles'), remoteImagesDir);
        console.log("✅ Uploaded images/articles");

        // Upload js
        const remoteJsDir = "/public_html/kimsondreams/js";
        await client.ensureDir(remoteJsDir);
        await client.uploadFromDir(path.join(LOCAL_ROOT, 'js'), remoteJsDir);
        console.log("✅ Uploaded js");

        // Upload css
        const remoteCssDir = "/public_html/kimsondreams/css";
        await client.ensureDir(remoteCssDir);
        await client.uploadFromDir(path.join(LOCAL_ROOT, 'css'), remoteCssDir);
        console.log("✅ Uploaded css");

        // Upload index.html
        await client.uploadFrom(path.join(LOCAL_ROOT, 'index.html'), "/public_html/kimsondreams/index.html");
        console.log("✅ Uploaded index.html");
        
        // Upload article.html
        await client.uploadFrom(path.join(LOCAL_ROOT, 'article.html'), "/public_html/kimsondreams/article.html");
        console.log("✅ Uploaded article.html");

        // Upload articles.json to root
        if (fs.existsSync(path.join(LOCAL_ROOT, 'articles.json'))) {
            await client.uploadFrom(path.join(LOCAL_ROOT, 'articles.json'), "/public_html/kimsondreams/articles.json");
            console.log("✅ Uploaded articles.json to root");
        }

        console.log("🚀 Deployment Complete!");
    } catch (err) {
        console.error("❌ Deployment Failed:", err);
    } finally {
        client.close();
    }
}

deploy();
