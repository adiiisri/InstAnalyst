import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execFile, execSync } from 'child_process';
import MediaModel from '../models/Media.js';
import FollowerModel from '../models/Follower.js';
import { getDbStatus } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

// Dynamically detect if python3 or python is available (cross-platform compatibility)
let pythonCommand = 'python';
try {
  execSync('python3 --version', { stdio: 'ignore' });
  pythonCommand = 'python3';
} catch (e) {
  try {
    execSync('python --version', { stdio: 'ignore' });
    pythonCommand = 'python';
  } catch (err) {
    console.warn('[System Warning] Python was not found on the system path.');
  }
}

const runPythonScraper = (url) => {
  return new Promise((resolve, reject) => {
    const pythonPath = pythonCommand;
    const scriptPath = path.resolve(__dirname, '../download.py');
    const env = { ...process.env };

    execFile(pythonPath, [scriptPath, url], { env }, (error, stdout, stderr) => {
      if (error) {
        console.error('[Python Exec Error]', error);
        reject(new Error(error.message || 'Python execution failed.'));
        return;
      }
      try {
        const marker = 'RESULT:';
        const idx = stdout.indexOf(marker);
        if (idx === -1) {
          reject(new Error('Python script did not return a valid result.'));
          return;
        }
        const jsonStr = stdout.substring(idx + marker.length).trim();
        const result = JSON.parse(jsonStr);
        resolve(result);
      } catch (err) {
        console.error('[Python JSON Parse Error]', err, stdout);
        reject(err);
      }
    });
  });
};

const updateEnvFile = (key, value) => {
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }
  
  const lines = content.split('\n');
  let found = false;
  const newLines = lines.map(line => {
    if (line.trim().startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  
  if (!found) {
    newLines.push(`${key}=${value}`);
  }
  
  fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
  process.env[key] = value;
};


const router = express.Router();

// --- IN-MEMORY FALLBACK DATA STORE ---
const mockUnfollowers = [
  { username: 'cyber_punk_dev', fullName: 'Alex Rivera', profilePicUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80', unfollowedAt: new Date(Date.now() - 1000 * 60 * 120) }, // 2 hours ago
  { username: 'insta_aesthetic_99', fullName: 'Jessica Vance', profilePicUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80', unfollowedAt: new Date(Date.now() - 1000 * 60 * 360) }, // 6 hours ago
  { username: 'pixel_builder', fullName: 'Derrick Ross', profilePicUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80', unfollowedAt: new Date(Date.now() - 1000 * 60 * 1440) }, // 24 hours ago
  { username: 'travel_nomad_clara', fullName: 'Clara Croft', profilePicUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80', unfollowedAt: new Date(Date.now() - 1000 * 60 * 2880) }, // 2 days ago
  { username: 'vector_alchemist', fullName: 'David Thorne', profilePicUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80', unfollowedAt: new Date(Date.now() - 1000 * 60 * 4320) }  // 3 days ago
];

const mockNotFollowingBack = [
  { username: 'elonmusk', fullName: 'Elon Musk', profilePicUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=150&h=150&q=80' },
  { username: 'zuck', fullName: 'Mark Zuckerberg', profilePicUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80' },
  { username: 'cristiano', fullName: 'Cristiano Ronaldo', profilePicUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80' },
  { username: 'dan_abramov', fullName: 'Dan Abramov', profilePicUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80' },
  { username: 'design_architect', fullName: 'Sophia Sterling', profilePicUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80' },
  { username: 'linux_wizard', fullName: 'Linus Torvalds', profilePicUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80' }
];

// Helper to seed DB if connected
const seedDatabaseIfNeeded = async () => {
  if (getDbStatus() === 'CONNECTED') {
    try {
      const count = await FollowerModel.countDocuments();
      if (count === 0) {
        console.log('[Database] Seeding initial follower data...');
        // Insert unfollowers
        const unfollowersToInsert = mockUnfollowers.map(u => ({
          username: u.username,
          fullName: u.fullName,
          profilePicUrl: u.profilePicUrl,
          isFollowingMe: false,
          isFollowedByMe: true, // We follow them, they unfollowed us
          unfollowedAt: u.unfollowedAt
        }));
        // Insert not following back
        const notFollowingBackToInsert = mockNotFollowingBack.map(n => ({
          username: n.username,
          fullName: n.fullName,
          profilePicUrl: n.profilePicUrl,
          isFollowingMe: false,
          isFollowedByMe: true
        }));
        await FollowerModel.insertMany([...unfollowersToInsert, ...notFollowingBackToInsert]);
        console.log('[Database] Seeding completed.');
      }
    } catch (err) {
      console.warn('[Database] Seeding failed:', err.message);
    }
  }
};

// Seed on startup (will be called in server.js after connection check)
setTimeout(seedDatabaseIfNeeded, 3000);

// --- API ENDPOINTS ---

// 1. System/API Status Endpoint
router.get('/status', (req, res) => {
  const dbStatus = getDbStatus();
  
  res.json({
    status: 'HEALTHY',
    database: dbStatus,
    activeSession: 'ACTIVE_SESSION_INSTANALYST_99F2X',
    rateLimits: {
      limit: 100,
      remaining: 92,
      resetSeconds: 420
    },
    systemMetrics: {
      cpuUsage: '2.4%',
      memoryUsed: '64.2 MB',
      latency: '12ms'
    }
  });
});


// 2. Media Downloader Endpoint
router.post('/download', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!url.includes('instagram.com/')) {
    return res.status(400).json({ error: 'Invalid URL. Must be a valid Instagram link.' });
  }

  try {
    console.log('[Downloader] Running Python scraper for:', url);
    const downloadResult = await runPythonScraper(url);

    if (downloadResult.error) {
      return res.status(400).json({
        error: downloadResult.error,
        message: downloadResult.message || 'Failed to extract Instagram media.'
      });
    }

    // Save metadata to database if connected
    if (getDbStatus() === 'CONNECTED') {
      try {
        const media = new MediaModel(downloadResult);
        await media.save();
      } catch (dbErr) {
        console.error('[Database Error] Failed to save media download metadata:', dbErr.message);
      }
    }

    return res.json(downloadResult);

  } catch (err) {
    console.error('[Downloader Error] Python scraper failed:', err.message);
    return res.status(500).json({
      error: 'EXTRACTION_FAILED',
      message: `Scraper error: ${err.message}`
    });
  }
});

// 3. Analytics Summary Endpoint
router.get('/analytics/summary', (req, res) => {
  res.json({
    totalFollowers: 24302,
    recentGains: 12,
    recentUnfollows: 5
  });
});

// 4. New Unfollowers Endpoint
router.get('/analytics/unfollowers', async (req, res) => {
  const searchQuery = (req.query.q || '').toLowerCase();

  if (getDbStatus() === 'CONNECTED') {
    try {
      const dbUnfollowers = await FollowerModel.find({ 
        unfollowedAt: { $ne: null } 
      }).lean();

      const formatted = dbUnfollowers.map(u => ({
        username: u.username,
        fullName: u.fullName,
        profilePicUrl: u.profilePicUrl,
        unfollowedAt: u.unfollowedAt
      }));

      const filtered = formatted.filter(u => 
        u.username.toLowerCase().includes(searchQuery) || 
        u.fullName.toLowerCase().includes(searchQuery)
      );

      return res.json(filtered);
    } catch (err) {
      console.error('[Database Error] Fetching unfollowers failed:', err.message);
    }
  }

  // Fallback to mock data
  const filtered = mockUnfollowers.filter(u => 
    u.username.toLowerCase().includes(searchQuery) || 
    u.fullName.toLowerCase().includes(searchQuery)
  );
  res.json(filtered);
});

// 5. Not Following Back Endpoint
router.get('/analytics/not-following-back', async (req, res) => {
  const searchQuery = (req.query.q || '').toLowerCase();

  if (getDbStatus() === 'CONNECTED') {
    try {
      // Find where isFollowedByMe is true but isFollowingMe is false
      const dbNotFollowing = await FollowerModel.find({
        isFollowedByMe: true,
        isFollowingMe: false,
        unfollowedAt: null // Exclude unfollowers
      }).lean();

      const formatted = dbNotFollowing.map(n => ({
        username: n.username,
        fullName: n.fullName,
        profilePicUrl: n.profilePicUrl
      }));

      const filtered = formatted.filter(n => 
        n.username.toLowerCase().includes(searchQuery) || 
        n.fullName.toLowerCase().includes(searchQuery)
      );

      return res.json(filtered);
    } catch (err) {
      console.error('[Database Error] Fetching not-following-back failed:', err.message);
    }
  }

  // Fallback to mock data
  const filtered = mockNotFollowingBack.filter(n => 
    n.username.toLowerCase().includes(searchQuery) || 
    n.fullName.toLowerCase().includes(searchQuery)
  );
  res.json(filtered);
});

// 6. Dynamic Username Analytics Endpoint
router.get('/analytics/user/:username', async (req, res) => {
  const { username } = req.params;
  
  let realFollowers = null;
  let realFollowing = null;
  let realProfilePic = null;
  let realFullName = null;
  
  try {
    const response = await fetch(`https://www.instagram.com/${username}/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' }
    });
    const html = await response.text();
    
    const matchDesc = html.match(/<meta property="og:description" content="([\d,MKB\.]+)\s+Followers,\s+([\d,MKB\.]+)\s+Following/i);
    const matchImage = html.match(/<meta property="og:image" content="([^"]+)"/i);
    const matchTitle = html.match(/<meta property="og:title" content="([^@]+)\s*\(@/i);

    if (matchDesc) {
      const parseCount = (str) => {
        let multiplier = 1;
        if (str.includes('M')) multiplier = 1000000;
        if (str.includes('K')) multiplier = 1000;
        return Math.floor(parseFloat(str.replace(/[,MKB]/ig, '')) * multiplier);
      };
      realFollowers = parseCount(matchDesc[1]);
      realFollowing = parseCount(matchDesc[2]);
    }
    if (matchImage) realProfilePic = matchImage[1];
    if (matchTitle) realFullName = matchTitle[1].trim();
  } catch (err) {
    console.warn('[Analytics Scraper] Failed to fetch real stats:', err.message);
  }

  // Deterministic mock generation for private data (lists)
  const seed = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const totalFollowers = realFollowers !== null ? realFollowers : Math.floor(seed * 42.5);
  const totalFollowing = realFollowing !== null ? realFollowing : Math.floor(seed * 1.5);
  const profilePicUrl = realProfilePic || `https://i.pravatar.cc/150?u=${seed}`;
  const fullName = realFullName || username;

  const recentGains = Math.floor((seed % 100) / 2);
  const recentUnfollows = Math.floor((seed % 50) / 3);

  // Generate dynamic unfollowers list
  const unfollowersList = Array.from({ length: Math.min(recentUnfollows, 15) }, (_, i) => ({
    username: `${username}_unfollower_${i + 1}`,
    fullName: `Former Fan ${i + 1}`,
    profilePicUrl: `https://i.pravatar.cc/150?u=${seed + i}`,
    unfollowedAt: new Date(Date.now() - 1000 * 60 * 60 * (i + 1))
  }));

  // Generate dynamic not following back list
  const notFollowingBackList = Array.from({ length: Math.min(totalFollowing - totalFollowers, 10 > 0 ? 10 : Math.floor(seed % 20)) }, (_, i) => ({
    username: `celeb_${i + 1}_${seed}`,
    fullName: `Verified User ${i + 1}`,
    profilePicUrl: `https://i.pravatar.cc/150?u=${seed + i + 100}`,
  }));

  setTimeout(() => {
    res.json({
      username,
      fullName,
      profilePicUrl,
      totalFollowers,
      totalFollowing,
      recentGains,
      recentUnfollows,
      unfollowers: unfollowersList,
      notFollowingBack: notFollowingBackList
    });
  }, 600);
});

// 7. Proxy Download Endpoint (with CORS bypass, proper streaming & Content-Disposition support)
router.get('/proxy', async (req, res) => {
  const { url, filename } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.instagram.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch media from CDN: ${response.status} ${response.statusText}`);
    }

    // Set CORS and Cross-Origin Resource Policy headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Set headers from the source CDN response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Force direct download if filename is specified
    if (filename) {
      const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    }

    // Stream the body chunk-by-chunk to the client
    const body = response.body;
    for await (const chunk of body) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    console.error('[Proxy Error]', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy fetch failed', message: err.message });
    }
  }
});

export default router;
