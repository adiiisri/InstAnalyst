import React, { useState, useEffect, useCallback } from 'react';
import ImageEditor from './components/ImageEditor';
import VideoEditor from './components/VideoEditor';

const PROD_API_URL = 'https://instanalyst.onrender.com/api';
const API_URL = import.meta.env.PROD ? PROD_API_URL : 'http://localhost:5001/api';

// Fetch with timeout helper (short 20s timeout per attempt, we retry ourselves)
const fetchWithTimeout = (url, options = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
};

export default function App() {
  const [activePill, setActivePill] = useState('Video');
  const [inputUrl, setInputUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState(''); // live status text
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [lastAttemptUrl, setLastAttemptUrl] = useState('');
  const [editingMedia, setEditingMedia] = useState(null);
  const [toasts, setToasts] = useState([]);
  
  // Dynamic Analytics State
  const [analyticsUsernameInput, setAnalyticsUsernameInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Theme State
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Pre-warm Render backend on page load to reduce cold-start latency
  useEffect(() => {
    if (import.meta.env.PROD) {
      fetch(`${PROD_API_URL.replace('/api', '/')}`).catch(() => {});
    }
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const fetchAnalytics = async (e) => {
    e.preventDefault();
    if (!analyticsUsernameInput) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_URL}/analytics/user/${analyticsUsernameInput}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
        addToast(`Analytics loaded for @${analyticsUsernameInput}`, 'success');
      } else {
        throw new Error('API Error');
      }
    } catch (err) {
      // Local Fallback simulation
      addToast('Simulating local data...', 'info');
      setTimeout(() => {
        const seed = analyticsUsernameInput.length * 123;
        setAnalyticsData({
          username: analyticsUsernameInput,
          totalFollowers: seed * 12,
          totalFollowing: seed * 3,
          recentGains: 45,
          recentUnfollows: 12,
          unfollowers: [{ username: 'lost_fan', fullName: 'John Doe', profilePicUrl: 'https://i.pravatar.cc/150' }],
          notFollowingBack: [{ username: 'famous_person', fullName: 'VIP User', profilePicUrl: 'https://i.pravatar.cc/150?u=1' }]
        });
      }, 500);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const forceDownload = async (url, filename) => {
    try {
      const proxyUrl = `${API_URL}/proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      const link = document.createElement('a');
      link.href = proxyUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      window.open(url, '_blank'); // fallback
    }
  };

  const handleDownloadAll = (items) => {
    addToast(`Preparing to download ${items.length} files...`, 'info');
    items.forEach((item, index) => {
      setTimeout(() => {
        forceDownload(item.downloadUrl, `InstAnalyst_Carousel_${item.id}.jpg`);
      }, index * 500); // Stagger downloads slightly
    });
  };

  const handleDownload = async (e, directUrl = null) => {
    if (e) e.preventDefault();
    const urlToFetch = directUrl || inputUrl;
    if (!urlToFetch) return;

    setIsDownloading(true);
    setDownloadHistory([]);
    setLastAttemptUrl(urlToFetch);
    setDownloadStatus('Connecting...');

    // Keep retrying for up to 3 minutes total (Render cold start can take ~90s)
    const MAX_WAIT_MS = 180000;
    const ATTEMPT_TIMEOUT_MS = 20000; // 20s per attempt
    const RETRY_DELAY_MS = 2000;      // 2s gap between attempts
    const startTime = Date.now();
    let attempt = 0;
    let lastError = null;

    while (Date.now() - startTime < MAX_WAIT_MS) {
      attempt++;
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      if (attempt === 1) {
        setDownloadStatus('Connecting to server...');
      } else {
        setDownloadStatus(`Server waking up... ${elapsed}s elapsed, retrying...`);
      }

      try {
        const response = await fetchWithTimeout(`${API_URL}/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlToFetch, type: activePill })
        }, ATTEMPT_TIMEOUT_MS);

        if (response.ok) {
          const newMedia = await response.json();
          setDownloadHistory([newMedia]);
          setInputUrl('');
          setDownloadStatus('');
          addToast('Media fetched successfully!', 'success');
          setIsDownloading(false);
          return;
        } else {
          // A real API error (not a connectivity error) — don't retry
          const errData = await response.json().catch(() => ({}));
          lastError = new Error(errData.message || 'Failed to analyze link.');
          break;
        }
      } catch (err) {
        lastError = err;
        const isConnErr = err.name === 'AbortError' || err.message === 'Failed to fetch';
        if (!isConnErr) break; // Non-network error, stop retrying
        console.warn(`[Attempt ${attempt}] Cold-start timeout, retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }

    // All retries exhausted
    const isConnectivity = lastError?.name === 'AbortError' || lastError?.message === 'Failed to fetch';
    const userMessage = isConnectivity
      ? 'Server took too long to respond. Click Retry or try again in a moment.'
      : (lastError?.message || 'Failed to download media.');
    setDownloadStatus('');
    setDownloadHistory([{ error: 'DOWNLOAD_FAILED', message: userMessage }]);
    setIsDownloading(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text);
        addToast('Link pasted from clipboard');
        handleDownload(null, text); // Auto-search on paste
      }
    } catch (err) {
      addToast('Please allow clipboard permissions to paste automatically.', 'error');
    }
  };

  const pills = ['Video', 'Photo', 'Reels', 'Story', 'IGTV', 'Carousel', 'Viewer'];

  // Sync active tab with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const matchedPill = pills.find(p => p.toLowerCase() === hash.toLowerCase());
      if (matchedPill) setActivePill(matchedPill);
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run once on mount
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Clear input URL and search history when active tab changes
  useEffect(() => {
    setInputUrl('');
    setDownloadHistory([]);
  }, [activePill]);

  return (
    <div className="app-wrapper">
      
      {/* 1. Header (White) */}
      <header className="fastdl-header">
        <div className="header-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="6" y1="20" x2="6" y2="16"></line>
            <line x1="12" y1="4" x2="12" y2="20"></line>
            <polyline points="8 16 12 20 16 16"></polyline>
          </svg>
          InstAnalyst
        </div>
        <nav className="header-nav">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{background:'transparent', border:'none', color:'var(--text-primary)', cursor:'pointer', display:'flex', alignItems:'center', fontSize: '1.2rem'}}
            title="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <a href="#analytics" className="nav-link">Analytics</a>
          <div className="nav-link">FAQ</div>
          <div className="nav-link">EN ▾</div>
        </nav>
      </header>

      {/* 2. Hero Section (Gradient) */}
      <main className="hero-section">
        
        {/* Media Pills */}
        <div className="media-pills">
          {pills.map((pill) => (
            <a 
              key={pill} 
              href={`#${pill.toLowerCase()}`}
              className={`media-pill ${activePill === pill ? 'active' : ''}`}
              style={{textDecoration: 'none'}}
              onClick={() => setActivePill(pill)}
            >
              {pill === 'Video' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>}
              {pill === 'Photo' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>}
              {pill === 'Reels' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>}
              {pill === 'Story' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
              {pill === 'IGTV' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>}
              {pill === 'Carousel' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>}
              {pill === 'Viewer' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>}
              {pill}
            </a>
          ))}
        </div>

        {/* Headings */}
        <h1 className="hero-title">
          Instagram {activePill === 'Viewer' ? 'Profile Viewer' : activePill + ' Downloader'}
        </h1>
        <h2 className="hero-subtitle">
          Download Instagram {activePill === 'IGTV' ? 'IGTV Videos' : activePill + 's'} easily and quickly
        </h2>

        {/* 3. Central Unified Input Box */}
        <form className="downloader-form" onSubmit={(e) => handleDownload(e)}>
          <input 
            type="text" 
            className="downloader-input" 
            placeholder="Insert instagram link here"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData('text');
              if (pastedText) {
                handleDownload(null, pastedText); // Auto-search on manual paste
              }
            }}
          />
          <div className="downloader-actions">
            {inputUrl ? (
              <button type="button" className="btn-paste" onClick={() => setInputUrl('')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Clear
              </button>
            ) : (
              <button type="button" className="btn-paste" onClick={handlePaste}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                Paste
              </button>
            )}
            <button type="submit" className="btn-download" disabled={isDownloading || !inputUrl}>
              {isDownloading ? (
                <span style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <span style={{display:'inline-block',width:'12px',height:'12px',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></span>
                  {downloadStatus || 'Loading...'}
                </span>
              ) : 'Download'}
            </button>
          </div>
        </form>

        {/* Big Logo beneath form */}
        {downloadHistory.length === 0 && (
          <div className="hero-logo-large">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="6" y1="20" x2="6" y2="16"></line>
              <line x1="12" y1="4" x2="12" y2="20"></line>
              <polyline points="8 16 12 20 16 16"></polyline>
            </svg>
            InstAnalyst
          </div>
        )}

        {/* Results Area */}
        {editingMedia && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto', padding: '20px', boxSizing: 'border-box' }}>
             <div style={{ width: '100%', maxWidth: '800px', background: 'var(--bg-primary)', borderRadius: '12px', padding: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', maxHeight: '95vh', overflowY: 'auto' }}>
               {editingMedia.type === 'video' ? (
                 <VideoEditor 
                   src={editingMedia.src} 
                   apiUrl={API_URL}
                   onCancel={() => setEditingMedia(null)} 
                   onDownload={(url) => { forceDownload(url, 'instanalyst-edited.mp4'); setEditingMedia(null); }} 
                 />
               ) : (
                 <ImageEditor 
                   src={editingMedia.src} 
                   onCancel={() => setEditingMedia(null)} 
                   onDownload={(url) => { forceDownload(url, 'instanalyst-edited.jpg'); setEditingMedia(null); }} 
                 />
               )}
             </div>
          </div>
        )}
        {downloadHistory.length > 0 && (
          <div className="results-area">
            {downloadHistory.map((item, idx) => {
              if (item.error) {
                return (
                  <div className="result-card" key={idx} style={{ borderColor: '#ef4444', borderStyle: 'solid', borderWidth: '1px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontWeight: 'bold' }}>
                        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                        <span>Download Failed</span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        {item.message}
                      </p>
                      {lastAttemptUrl && (
                        <button
                          className="btn-download"
                          style={{ alignSelf: 'flex-start', padding: '8px 20px', fontSize: '0.9rem' }}
                          onClick={() => handleDownload(null, lastAttemptUrl)}
                        >
                          🔄 Retry
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              return item.isCarousel ? (
                <div key={idx} style={{width: '100%'}}>
                  <div className="carousel-header">
                    <h3 style={{color: 'var(--text-primary)'}}>{item.title} ({item.items.length} Photos)</h3>
                    <button className="btn-download-all" onClick={() => handleDownloadAll(item.items)}>
                      Download All
                    </button>
                  </div>
                  <div className="carousel-grid">
                    {item.items.map((photo) => (
                      <div className="carousel-item" key={photo.id}>
                        <img src={photo.thumbnail} alt="Preview" className="carousel-thumbnail"/>
                        <div className="carousel-actions">
                          <span style={{fontSize:'0.8rem', color:'#6b7280'}}>{photo.fileSize}</span>
                          <button 
                            className="btn-download-result" 
                            style={{width: '100%', boxSizing: 'border-box', border: 'none', padding: '10px 16px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontWeight: '600', cursor: 'pointer'}}
                            onClick={() => {
                              addToast('Downloading photo...', 'success');
                              forceDownload(photo.downloadUrl, `InstAnalyst_Carousel_${photo.id}.jpg`);
                            }}
                          >
                            Download JPG
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="result-card" key={idx}>
                  {item.mediaType === 'Photo' ? (
                    <img src={item.downloadUrl} alt="High Res Photo" className="result-thumbnail"/>
                  ) : (
                    <video 
                      src={item.downloadUrl} 
                      controls 
                      preload="metadata" 
                      className="result-thumbnail" 
                      style={{backgroundColor: '#000'}}
                    />
                  )}
                  <div className="result-info">
                    <h3 className="result-title">{item.title}</h3>
                    <div style={{color: '#6b7280', fontSize: '0.9rem'}}>{item.mediaType} • {item.fileSize}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <button 
                        className="btn-download-result" 
                        style={{flex: 1, border: 'none', padding: '10px 16px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontWeight: '600', cursor: 'pointer'}}
                        onClick={() => {
                          addToast(`Downloading highest quality ${item.mediaType}...`, 'success');
                          forceDownload(item.downloadUrl, `InstAnalyst_${item.mediaType}.${item.mediaType === 'Photo' ? 'jpg' : 'mp4'}`);
                        }}
                      >
                        Download Original
                      </button>
                      <button 
                        className="btn-paste" 
                        style={{flex: 1, padding: '10px 16px', margin: 0, justifyContent: 'center'}}
                        onClick={() => setEditingMedia({ type: item.mediaType === 'Photo' ? 'photo' : 'video', src: item.downloadUrl })}
                      >
                        Edit Media
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Secondary Analytics Section (Hidden below fold) */}
        <div id="analytics" className="analytics-section">
          <h2 className="analytics-title">Account Analytics</h2>
          
          <form className="analytics-search-form" onSubmit={fetchAnalytics}>
            <input 
              type="text" 
              className="analytics-input" 
              placeholder="Enter Instagram username..." 
              value={analyticsUsernameInput}
              onChange={(e) => setAnalyticsUsernameInput(e.target.value)}
            />
            <button type="submit" className="btn-download" disabled={isAnalyzing || !analyticsUsernameInput}>
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </form>

          {analyticsData && (
            <>
              <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                <img src={analyticsData.profilePicUrl} alt="Profile" style={{width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover'}} />
                <div>
                  <h3 style={{fontSize: '1.5rem', margin: 0, color: 'var(--text-primary)'}}>{analyticsData.fullName}</h3>
                  <p style={{margin: 0, color: 'var(--text-secondary)'}}>@{analyticsData.username}</p>
                </div>
              </div>

              <div className="analytics-grid">
                <div className="analytics-card">
                  <div className="analytics-value">{analyticsData.totalFollowers.toLocaleString()}</div>
                  <div className="analytics-label">Followers</div>
                </div>
                <div className="analytics-card">
                  <div className="analytics-value" style={{color: '#34d399'}}>+{analyticsData.recentGains}</div>
                  <div className="analytics-label">Recent Gains</div>
                </div>
                <div className="analytics-card">
                  <div className="analytics-value" style={{color: '#f87171'}}>-{analyticsData.recentUnfollows}</div>
                  <div className="analytics-label">Unfollowers</div>
                </div>
              </div>

              <div className="analytics-trackers">
                <div className="tracker-group">
                  <h3>Recent Unfollowers</h3>
                  {analyticsData.unfollowers.length === 0 ? <p style={{opacity:0.6}}>No recent unfollowers found.</p> : null}
                  {analyticsData.unfollowers.map((user, idx) => (
                    <div className="tracker-row" key={idx}>
                      <img src={user.profilePicUrl} className="tracker-avatar" alt="Avatar"/>
                      <div className="tracker-info">
                        <span className="tracker-username">@{user.username}</span>
                        <span className="tracker-fullname">{user.fullName}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="tracker-group">
                  <h3>Not Following You Back</h3>
                  {analyticsData.notFollowingBack.length === 0 ? <p style={{opacity:0.6}}>Everyone follows you back!</p> : null}
                  {analyticsData.notFollowingBack.map((user, idx) => (
                    <div className="tracker-row" key={idx}>
                      <img src={user.profilePicUrl} className="tracker-avatar" alt="Avatar"/>
                      <div className="tracker-info">
                        <span className="tracker-username">@{user.username}</span>
                        <span className="tracker-fullname">{user.fullName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

      </main>

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
