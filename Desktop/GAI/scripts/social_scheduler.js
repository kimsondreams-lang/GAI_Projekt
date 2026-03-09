const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CONFIG_PATH = path.join(__dirname, '../config/social_media_config.json');
const SCHEDULED_PATH = path.join(__dirname, '../data/social_media/scheduled');
const POSTS_PATH = path.join(__dirname, '../data/social_media/posts');
const LOGS_PATH = path.join(__dirname, '../data/social_media/logs');

// Ensure directories exist
[SCHEDULED_PATH, POSTS_PATH, LOGS_PATH].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function logMessage(level, message) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message
  };
  const logFile = path.join(LOGS_PATH, `scheduler_${new Date().toISOString().split('T')[0]}.lo`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  console.log(`[${level}] ${message}`);
}

async function postToTwitter(content, imageUrl) {
  const config = loadConfig();
  logMessage('info', `Twitter post prepared: ${content.substring(0, 50)}...`);
  return { success: true, platform: 'twitter', postId: 'mock_' + Date.now() };
}

async function postToPinterest(title, description, imageUrl, link) {
  const config = loadConfig();
  logMessage('info', `Pinterest pin prepared: ${title}`);
  return { success: true, platform: 'pinterest', postId: 'mock_' + Date.now() };
}

async function postToFacebook(message, imageUrl, link) {
  const config = loadConfig();
  logMessage('info`, `Facebook post prepared: ${message.substring(0, 50)}...`);
  return { success: true, platform: 'facebook', postId: 'mock_' + Date.now() };
}

function schedulePost(platform, content, scheduledTime, imageUrl = null, link = null) {
  const post = {
    id: Date.now(),
    platform,
    content,
    scheduledTime,
    imageUrl,
    link,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(SCHEDULED_PATH, `post_${post.id}.json`), JSON.stringify(post, null, 2));
  logMessage('info`, `Post scheduled: ${platform} at ${scheduledTime}`);
  return post;
}

function getPendingPosts() {
  if (!fs.existsSync(SCHEDULED_PATH)) return [];
  const files = fs.readdirSync(SCHEDULED_PATH);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(SCHEDULED_PATH, f), 'utf8')))
    .filter(p => p.status === 'pending');
}

async function publishPost(post) {
  try {
    let result;
    switch(post.platform) {
      case 'twitter':
        result = await postToTwitter(post.content, post.imageUrl);
        break;
      case 'pinterest':
        result = await postToPinterest(post.content, post.content, post.imageUrl, post.link);
        break;
      case 'facebook':
        result = await postToFacebook(post.content, post.imageUrl, post.link);
        break;
      default:
        throw new Error(`Unknown platform: ${post.platform}`);
    }
    
    const postFile = path.join(SCHEDULED_PATH, `post_${post.id}.json`);
    post.status = 'published';
    post.publishedAt = new Date().toISOString();
    post.result = result;
    fs.writeFileSync(postFile, JSON.stringify(post, null, 2));
    
    logMessage('info', `Post ${post.id} published successfully to ${post.platform}`);
    return result;
  } catch (error) {
    post.status = 'failed';
    post.error = error.message;
    const postFile = path.join(SCHEDULED_PATH, `post_${post.id}.json`);
    fs.writeFileSync(postFile, JSON.stringify(post, null, 2));
    logMessage('error', `Post ${post.id} failed: ${error.message}`);
    throw error;
  }
}

async function processPendingPosts() {
  const pending = getPendingPosts();
  const now = new Date();
  let processed = 0;
  
  for (const post of pending) {
    if (new Date(post.scheduledTime) <= now) {
      await publishPost(post);
      processed++;
    }
  }
  
  logMessage('info', `Processed ${processed} pending posts`);
  return processed;
}

module.exports = {
  loadConfig,
  schedulePost,
  getPendingPosts,
  publishPost,
  processPendingPosts,
  postToTwitter,
  postToPinterest,
  postToFacebook,
  logMessage
};