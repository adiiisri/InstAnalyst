import React, { useState, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function ImageEditor({ src, onCancel, onDownload }) {
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  
  // Filters
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [grayscale, setGrayscale] = useState(0);

  // Apply filters to image element
  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%)`,
    maxWidth: '100%',
    maxHeight: '400px'
  };

  const handleProcess = () => {
    if (!imgRef.current) return;
    
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // If no crop, use full image dimensions
    const cropX = completedCrop ? (completedCrop.x * image.naturalWidth) / image.width : 0;
    const cropY = completedCrop ? (completedCrop.y * image.naturalHeight) / image.height : 0;
    const cropW = completedCrop ? (completedCrop.width * image.naturalWidth) / image.width : image.naturalWidth;
    const cropH = completedCrop ? (completedCrop.height * image.naturalHeight) / image.height : image.naturalHeight;

    canvas.width = cropW;
    canvas.height = cropH;

    // Apply filters to canvas
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%)`;
    
    ctx.drawImage(
      image,
      cropX, cropY, cropW, cropH,
      0, 0, cropW, cropH
    );

    canvas.toBlob((blob) => {
      if (!blob) {
        alert('Canvas is empty');
        return;
      }
      const url = URL.createObjectURL(blob);
      onDownload(url);
    }, 'image/jpeg', 0.95);
  };

  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
      <h3 style={{marginBottom: '10px', color:'var(--text-primary)'}}>Image Editor</h3>
      
      <div style={{ display: 'flex', justifyContent: 'center', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
        <ReactCrop 
          crop={crop} 
          onChange={c => setCrop(c)} 
          onComplete={c => setCompletedCrop(c)}
        >
          <img 
            ref={imgRef}
            src={src} 
            crossOrigin="anonymous"
            style={filterStyle} 
            alt="Edit preview" 
          />
        </ReactCrop>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px', color:'var(--text-primary)' }}>
        <label style={{ display: 'flex', alignItems: 'center' }}>
           <span style={{width: '90px'}}>Brightness:</span>
           <input type="range" min="0" max="200" value={brightness} onChange={e => setBrightness(e.target.value)} style={{flex: 1}} />
           <span style={{width: '40px', textAlign:'right'}}>{brightness}%</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center' }}>
           <span style={{width: '90px'}}>Contrast:</span>
           <input type="range" min="0" max="200" value={contrast} onChange={e => setContrast(e.target.value)} style={{flex: 1}} />
           <span style={{width: '40px', textAlign:'right'}}>{contrast}%</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center' }}>
           <span style={{width: '90px'}}>Saturation:</span>
           <input type="range" min="0" max="200" value={saturation} onChange={e => setSaturation(e.target.value)} style={{flex: 1}} />
           <span style={{width: '40px', textAlign:'right'}}>{saturation}%</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center' }}>
           <span style={{width: '90px'}}>Grayscale:</span>
           <input type="range" min="0" max="100" value={grayscale} onChange={e => setGrayscale(e.target.value)} style={{flex: 1}} />
           <span style={{width: '40px', textAlign:'right'}}>{grayscale}%</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button className="btn-download" onClick={handleProcess} style={{flex:1, justifyContent: 'center'}}>
          Apply & Download
        </button>
        <button className="btn-paste" onClick={onCancel} style={{flex:1, justifyContent: 'center'}}>
          Cancel
        </button>
      </div>
    </div>
  );
}
