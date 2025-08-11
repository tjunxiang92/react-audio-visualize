# AudioVisualizer Usage Examples

## New Features Added

### 1. Interactive Seekbar
Click on the waveform to seek to that position in the audio.

```tsx
<AudioVisualizer
  blob={audioBlob}
  height={80}
  currentTime={currentTime}
  onSeek={(time) => {
    // Seek to the clicked time in seconds
    audioRef.current.currentTime = time;
  }}
/>
```

### 2. Responsive Width
Automatically adjusts to container width when width prop is not provided.

```tsx
<div style={{ width: '100%', maxWidth: '800px' }}>
  <AudioVisualizer
    blob={audioBlob}
    height={80}
    // width prop omitted - will auto-resize to container
    currentTime={currentTime}
  />
</div>
```

### 3. Dual Channel Visualization
Shows left channel on top, right channel on bottom with a separator line.

```tsx
<AudioVisualizer
  blob={audioBlob}
  width={800}
  height={120}
  currentTime={currentTime}
  showSeparateChannels={true}
  onSeek={(time) => {
    audioRef.current.currentTime = time;
  }}
/>
```

## Complete Example with All Features

```tsx
import React, { useState, useRef } from 'react';
import { AudioVisualizer } from 'react-audio-visualize';

function MyAudioPlayer({ audioBlob }) {
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  
  const handleSeek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div style={{ width: '100%', padding: '20px' }}>
      <audio
        ref={audioRef}
        src={URL.createObjectURL(audioBlob)}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
      />
      
      {/* Responsive waveform with seeking and dual channels */}
      <AudioVisualizer
        blob={audioBlob}
        height={120}
        currentTime={currentTime}
        showSeparateChannels={true}
        onSeek={handleSeek}
        barColor="rgb(184, 184, 184)"
        barPlayedColor="rgb(160, 198, 255)"
        style={{ border: '1px solid #ddd', borderRadius: '4px' }}
      />
    </div>
  );
}
```

## Props Reference

### New Props

- `width?: number` - Width is now optional. If not provided, will auto-resize to container
- `onSeek?: (time: number) => void` - Callback when user clicks to seek. Returns time in seconds
- `showSeparateChannels?: boolean` - Show left/right channels separately (default: false)

### Existing Props (unchanged)

- `blob: Blob` - Audio blob to visualize
- `height: number` - Height of visualizer  
- `barWidth?: number` - Width of bars (default: 2)
- `gap?: number` - Gap between bars (default: 1)
- `backgroundColor?: string` - Background color (default: "transparent")
- `barColor?: string` - Color of unplayed bars
- `barPlayedColor?: string` - Color of played bars
- `currentTime?: number` - Current playback time for progress indication
- `style?: React.CSSProperties` - Additional CSS styles