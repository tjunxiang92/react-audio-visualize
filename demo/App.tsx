import React, { useState, useRef, useEffect } from 'react';
import { AudioVisualizer } from '../src';
import './App.css';

function App() {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSeparateChannels, setShowSeparateChannels] = useState(false);
  const [useFixedWidth, setUseFixedWidth] = useState(false);
  const [fileName, setFileName] = useState('');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioBlob]);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('audio/')) {
      const blob = new Blob([file], { type: file.type });
      setAudioBlob(blob);
      setFileName(file.name);
      setCurrentTime(0);
      setIsPlaying(false);
      
      // Create audio URL for the audio element
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(blob);
      }
    } else {
      alert('Please select an audio file');
    }
  };

  const handleFilePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioBlob) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRate = parseFloat(e.target.value);
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app">
      <div className="container">
        <h1>🎵 AudioVisualizer Feature Demo</h1>
        <p>This example demonstrates the three new features:</p>
        <ul>
          <li><strong>Interactive Seekbar:</strong> Click on waveform to seek</li>
          <li><strong>Responsive Width:</strong> Resizes with window</li>
          <li><strong>Dual Channel:</strong> Separate left/right visualization</li>
        </ul>
        
        <div 
          className="file-picker"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div>
            <strong>📁 Click to select audio file or drag & drop</strong>
            <br />
            <small>Supports: MP3, WAV, OGG, M4A, etc.</small>
            {fileName && (
              <div style={{ marginTop: '10px', color: '#007bff' }}>
                Selected: {fileName}
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFilePicker}
            accept="audio/*"
            style={{ display: 'none' }}
          />
        </div>

        <audio
          ref={audioRef}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        />

        {audioBlob && (
          <>
            <div className="feature-demo">
              <h4>🎯 Feature Controls</h4>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={showSeparateChannels}
                    onChange={(e) => setShowSeparateChannels(e.target.checked)}
                  />
                  {' '}Show Dual Channels
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={useFixedWidth}
                    onChange={(e) => setUseFixedWidth(e.target.checked)}
                  />
                  {' '}Fixed Width (800px)
                </label>
              </div>
            </div>

            <div className="visualizer-container">
              <AudioVisualizer
                blob={audioBlob}
                width={useFixedWidth ? 800 : undefined}
                height={80}
                currentTime={currentTime}
                onSeek={handleSeek}
                barColor="rgb(184, 184, 184)"
                barPlayedColor="rgb(160, 198, 255)"
                backgroundColor="rgb(250, 250, 250)"
                style={{ 
                  display: 'block',
                  width: '100%'
                }}
              />
            </div>

            <div className="controls">
              <div className="control-group">
                <button onClick={togglePlay}>
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
              </div>
              
              <div className="control-group">
                <span>🔊</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                />
                <span>{Math.round(volume * 100)}%</span>
              </div>

              <div className="control-group">
                <span>⚡</span>
                <select value={playbackRate} onChange={handlePlaybackRateChange}>
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>

              <div className="control-group time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="feature-demo">
              <h4>✨ Features in Action</h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>Click on waveform</strong> to seek to any position</li>
                <li><strong>Resize window</strong> to see responsive width (when fixed width is off)</li>
                <li><strong>Toggle dual channels</strong> to see left/right separation</li>
                <li><strong>Hover cursor</strong> changes to pointer when seekable</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;