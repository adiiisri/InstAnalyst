import React, { useState, useEffect, useCallback } from 'react';

const API_URL = 'http://localhost:5001/api';

export default function App() {
  const [activePill, setActivePill] = useState('Video');
  const [inputUrl, setInputUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadHistory, setDownloadHistory] = useState([]);
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

    try {
      const response = await fetch(`${API_URL}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToFetch, type: activePill })
      });

      if (response.ok) {
        const newMedia = await response.json();
        setDownloadHistory([newMedia]); // Show only latest result
        setInputUrl('');
        addToast('Media analyzed successfully!', 'success');
      } else {
        throw new Error('Failed to analyze link.');
      }
    } catch (err) {
      // Offline fallback
      setTimeout(() => {
        let mockResult;
        if (activePill === 'Carousel') {
          mockResult = {
            url: urlToFetch,
            title: 'Instagram Photo Carousel',
            mediaType: 'Carousel',
            isCarousel: true,
            items: [
              { id: 1, thumbnail: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=350&h=350&q=80', downloadUrl: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1080&h=1080&q=100', fileSize: '1.2 MB' },
              { id: 2, thumbnail: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=350&h=350&q=80', downloadUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1080&h=1080&q=100', fileSize: '1.5 MB' },
              { id: 3, thumbnail: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=350&h=350&q=80', downloadUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1080&h=1080&q=100', fileSize: '1.1 MB' }
            ]
          };
        } else {
          const isPhoto = activePill === 'Photo';
          mockResult = {
            url: urlToFetch,
            title: 'Instagram ' + activePill + ' Ready',
            thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=350&h=350&q=80',
            mediaType: activePill,
            isCarousel: false,
            fileSize: isPhoto ? '1.8 MB' : '15.4 MB',
            downloadUrl: isPhoto ? 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1080&h=1080&q=100' : 'https://www.w3schools.com/html/mov_bbb.mp4',
          };
        }
        setDownloadHistory([mockResult]);
        setInputUrl('');
        addToast('Media parsed (Offline Mode)', 'success');
      }, 800);
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
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

  return (
    <div className="app-wrapper">
      
      {/* 1. Header (White) */}
      <header className="fastdl-header">
        <div className="header-brand">
          <svg viewBox="0 0 24 24"><path d="M12 2L2 12h3v8h14v-8h3L12 2z" /></svg>
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
              {isDownloading ? '...' : 'Download'}
            </button>
          </div>
        </form>

        {/* Big Logo beneath form */}
        {downloadHistory.length === 0 && (
          <div className="hero-logo-large">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12h3v8h14v-8h3L12 2z" /></svg>
            InstAnalyst
          </div>
        )}

        {/* Results Area */}
        {downloadHistory.length > 0 && (
          <div className="results-area">
            {downloadHistory.map((item, idx) => (
              item.isCarousel ? (
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
                    <button 
                      className="btn-download-result" 
                      style={{border: 'none', padding: '10px 16px', borderRadius: '6px', background: 'var(--accent-primary)', color: 'white', fontWeight: '600', cursor: 'pointer'}}
                      onClick={() => {
                        addToast(`Downloading highest quality ${item.mediaType}...`, 'success');
                        forceDownload(item.downloadUrl, `InstAnalyst_${item.mediaType}.${item.mediaType === 'Photo' ? 'jpg' : 'mp4'}`);
                      }}
                    >
                      Download High Quality {item.mediaType === 'Photo' ? 'JPG' : 'MP4'}
                    </button>
                  </div>
                </div>
              )
            ))}
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
