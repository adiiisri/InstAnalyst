import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function VideoEditor({ src, apiUrl, onCancel, onDownload }) {
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef(null);
  
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(10);
  const [removeAudio, setRemoveAudio] = useState(false);
  
  // Visual Crop State
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [enableCrop, setEnableCrop] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpeg = ffmpegRef.current;
    
    ffmpeg.on('progress', ({ progress, time }) => {
      setProgress(progress * 100);
    });
    
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setLoaded(true);
    } catch(err) {
      console.error('Failed to load ffmpeg:', err);
      alert('Failed to load video editor. Check CORS or network.');
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(Math.floor(videoRef.current.duration));
      setTrimEnd(Math.floor(videoRef.current.duration));
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    const ffmpeg = ffmpegRef.current;
    
    try {
      // Proxy the URL to bypass CORS
      const proxyUrl = `${apiUrl}/proxy?url=${encodeURIComponent(src)}`;
      const fileData = await fetchFile(proxyUrl);
      
      await ffmpeg.writeFile('input.mp4', fileData);

      let args = ['-i', 'input.mp4'];
      
      if (trimStart > 0 || trimEnd < duration) {
        args.push('-ss', `${trimStart}`);
        args.push('-to', `${trimEnd}`);
      }
      
      if (removeAudio) {
        args.push('-an');
      }

      if (enableCrop && completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
        const video = videoRef.current;
        // Calculate scaling from rendered size to actual video source size
        const scaleX = video.videoWidth / video.clientWidth;
        const scaleY = video.videoHeight / video.clientHeight;

        // FFmpeg libx264 requires dimensions to be divisible by 2
        const w = Math.round(completedCrop.width * scaleX) & ~1;
        const h = Math.round(completedCrop.height * scaleY) & ~1;
        const x = Math.round(completedCrop.x * scaleX) & ~1;
        const y = Math.round(completedCrop.y * scaleY) & ~1;

        args.push('-vf', `crop=${w}:${h}:${x}:${y}`);
        if (!removeAudio) {
           args.push('-c:a', 'copy');
        }
      } else {
         if (!removeAudio && trimStart === 0 && trimEnd === duration) {
           args.push('-c', 'copy');
         }
      }

      args.push('output.mp4');

      await ffmpeg.exec(args);
      const data = await ffmpeg.readFile('output.mp4');
      
      const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
      onDownload(url);
      
    } catch (err) {
      console.error(err);
      alert('Error processing video. Check console for details.');
    }
    setProcessing(false);
  };

  if (!loaded) {
    return <div style={{padding: '20px', textAlign: 'center', color:'var(--text-primary)'}}>Loading Video Engine...</div>;
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
       <h3 style={{marginBottom: '10px', color:'var(--text-primary)'}}>Advanced Video Editor</h3>
       
       <div style={{ display: 'flex', justifyContent: 'center', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
         <ReactCrop 
           crop={enableCrop ? crop : undefined} 
           onChange={c => setCrop(c)} 
           onComplete={c => setCompletedCrop(c)}
           disabled={!enableCrop}
           style={{ opacity: enableCrop ? 1 : 0.8 }}
         >
           <video 
             ref={videoRef} 
             src={src} 
             controls 
             onLoadedMetadata={handleLoadedMetadata}
             style={{ maxWidth: '100%', maxHeight: '400px', display: 'block' }}
           ></video>
         </ReactCrop>
       </div>
       
       <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px', color:'var(--text-primary)' }}>
         <div style={{ display: 'flex', gap: '10px' }}>
            <label>Start (s): 
              <input type="number" value={trimStart} max={trimEnd} min={0} onChange={e => setTrimStart(Number(e.target.value))} style={{width:'60px', marginLeft:'5px'}} />
            </label>
            <label>End (s): 
              <input type="number" value={trimEnd} min={trimStart} max={duration} onChange={e => setTrimEnd(Number(e.target.value))} style={{width:'60px', marginLeft:'5px'}} />
            </label>
         </div>
         
         <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
           <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
             <input type="checkbox" checked={removeAudio} onChange={e => setRemoveAudio(e.target.checked)} />
             Remove Audio
           </label>
           
           <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
             <input type="checkbox" checked={enableCrop} onChange={e => {
                setEnableCrop(e.target.checked);
                if (!e.target.checked) setCompletedCrop(null);
             }} />
             Enable Visual Cropper
           </label>
         </div>
       </div>

       <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
         <button className="btn-download" onClick={handleProcess} disabled={processing} style={{flex:1, justifyContent: 'center'}}>
           {processing ? `Processing... ${Math.round(progress)}%` : 'Apply & Download'}
         </button>
         <button className="btn-paste" onClick={onCancel} style={{flex:1, justifyContent: 'center'}}>Cancel</button>
       </div>
    </div>
  );
}
