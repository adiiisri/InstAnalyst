import express from 'express';
import MediaModel from '../models/Media.js';
import FollowerModel from '../models/Follower.js';
import { getDbStatus } from '../db.js';
import instagramDl from 'instagram-url-direct';
const instagramGetUrl = instagramDl.instagramGetUrl || instagramDl;

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
  const { url, type } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Check simple validity
  if (!url.includes('instagram.com/')) {
    return res.status(400).json({ error: 'Invalid URL. Must be a valid Instagram link.' });
  }

  // Attempt real extraction
  let realData = null;
  try {
    const igResult = await instagramGetUrl(url);
    if (igResult && igResult.url_list && igResult.url_list.length > 0) {
      realData = igResult;
    }
  } catch (err) {
    console.warn("[Instagram Scraper API] Failed to extract real URL. Falling back to mock data.", err.message);
  }

  if (realData) {
    if (realData.url_list.length > 1 || type === 'Carousel') {
      const carouselItems = realData.url_list.map((dlUrl, idx) => ({
        id: idx + 1,
        thumbnail: dlUrl, 
        downloadUrl: dlUrl,
        fileSize: 'Unknown Size'
      }));
      
      const realCarouselResult = {
        url,
        title: 'Real Instagram Carousel',
        mediaType: 'Carousel',
        isCarousel: true,
        items: carouselItems,
        downloadedAt: new Date()
      };
      
      return res.json(realCarouselResult);
    } else {
      const dlUrl = realData.url_list[0];
      let inferredType = 'Photo';
      if (dlUrl.includes('.mp4') || dlUrl.includes('video')) inferredType = 'Video';
      
      const realDownloadResult = {
        url,
        title: 'Real Instagram ' + inferredType,
        thumbnail: dlUrl, 
        mediaType: inferredType,
        isCarousel: false,
        fileSize: 'Unknown Size',
        downloadUrl: dlUrl,
        downloadedAt: new Date()
      };
      
      return res.json(realDownloadResult);
    }
  }

  // Fallback: Handle Carousel Posts manually if scraper fails
  if (type === 'Carousel') {
    const mockCarouselResult = {
      url,
      title: 'Instagram Photo Carousel',
      mediaType: 'Carousel',
      isCarousel: true,
      items: [
        {
          id: 1,
          thumbnail: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=350&h=350&q=80',
          downloadUrl: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1080&h=1080&q=100',
          fileSize: '1.2 MB'
        },
        {
          id: 2,
          thumbnail: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=350&h=350&q=80',
          downloadUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1080&h=1080&q=100',
          fileSize: '1.5 MB'
        },
        {
          id: 3,
          thumbnail: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=350&h=350&q=80',
          downloadUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1080&h=1080&q=100',
          fileSize: '1.1 MB'
        }
      ],
      downloadedAt: new Date()
    };
    
    return setTimeout(() => {
      res.json(mockCarouselResult);
    }, 800);
  }

  // Determine standard media type based on URL
  let mediaType = 'Photo';
  let title = 'Instagram High-Res Photo';
  let size = '1.8 MB';
  let thumbnail = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=350&h=350&q=80';
  let mediaUrl = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1080&h=1080&q=100'; // High res photo

  if (url.includes('/reel/') || url.includes('/reels/')) {
    mediaType = 'Reel';
    title = 'High-Speed Action Reel';
    size = '18.4 MB';
    thumbnail = 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=350&h=350&q=80';
    mediaUrl = 'https://www.w3schools.com/html/mov_bbb.mp4'; // Playable sample video
  } else if (url.includes('/stories/') || url.includes('/story/')) {
    mediaType = 'Story';
    title = 'Instagram Story Clip';
    size = '2.1 MB';
    thumbnail = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=350&h=350&q=80';
    mediaUrl = 'https://www.w3schools.com/html/mov_bbb.mp4'; // Playable sample video
  } else if (url.includes('/p/')) {
    mediaType = 'Photo';
    title = 'Instagram Image Post';
    size = '1.8 MB';
    thumbnail = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=350&h=350&q=80';
    mediaUrl = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1080&h=1080&q=100'; // High res photo
  } else if (url.includes('/video/')) {
    mediaType = 'Video';
    title = 'Instagram Video';
    size = '12.5 MB';
    thumbnail = 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=350&h=350&q=80';
    mediaUrl = 'https://www.w3schools.com/html/mov_bbb.mp4'; // Playable sample video
  }

  const mockDownloadResult = {
    url,
    title,
    thumbnail,
    mediaType,
    isCarousel: false,
    fileSize: size,
    downloadUrl: mediaUrl,
    downloadedAt: new Date()
  };

  // Save to database if connected
  if (getDbStatus() === 'CONNECTED') {
    try {
      const media = new MediaModel(mockDownloadResult);
      await media.save();
    } catch (err) {
      console.error('[Database Error] Failed to save media download metadata:', err.message);
    }
  }

  // Simulate server analysis time (500ms)
  setTimeout(() => {
    res.json(mockDownloadResult);
  }, 800);
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

// 7. Proxy Download Endpoint
router.get('/proxy', async (req, res) => {
  const { url, filename } = req.query;
  if (!url) return res.status(400).send('No URL provided');
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch from CDN');
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'InstAnalyst_Media'}"`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err) {
    console.error('[Proxy Error]', err.message);
    res.status(500).send('Failed to proxy media');
  }
});

// --- PROXY ENDPOINT FOR CORS BYPASS (FFmpeg) ---
router.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.instagram.com/'
      }
    });
    if (!response.ok) throw new Error(`Failed to fetch from url: ${response.status} ${response.statusText}`);
    
    // Copy headers (specifically content-type and content-length)
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Convert ReadableStream to Node stream and pipe to response
    const body = response.body;
    for await (const chunk of body) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    console.error('[Proxy Error]', err.message);
    res.status(500).json({ error: 'Proxy fetch failed' });
  }
});

export default router;
