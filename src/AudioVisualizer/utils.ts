import { type dataPoint } from "./types";

interface CustomCanvasRenderingContext2D extends CanvasRenderingContext2D {
  roundRect: (
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
  ) => void;
}

// Cache for processed audio data
const audioCache = new WeakMap<Blob, { leftData: dataPoint[], rightData: dataPoint[], duration: number }>();

const FIXED_BARS = 600;

// Process audio buffer into fixed number of bars (cached)
export const processAudioToFixedBars = (
  buffer: AudioBuffer,
  channel: number = 0
): dataPoint[] => {
  const bufferData = buffer.getChannelData(channel);
  const step = Math.floor(bufferData.length / FIXED_BARS);

  let data: dataPoint[] = [];
  let maxDataPoint = 0;

  for (let i = 0; i < FIXED_BARS; i++) {
    const mins: number[] = [];
    let minCount = 0;
    const maxs: number[] = [];
    let maxCount = 0;

    for (let j = 0; j < step && i * step + j < bufferData.length; j++) {
      const datum = bufferData[i * step + j];
      if (datum <= 0) {
        mins.push(datum);
        minCount++;
      }
      if (datum > 0) {
        maxs.push(datum);
        maxCount++;
      }
    }
    const minAvg = mins.reduce((a, c) => a + c, 0) / minCount;
    const maxAvg = maxs.reduce((a, c) => a + c, 0) / maxCount;

    const dataPoint = { max: isNaN(maxAvg) ? 0 : maxAvg, min: isNaN(minAvg) ? 0 : minAvg };

    if (dataPoint.max > maxDataPoint) maxDataPoint = dataPoint.max;
    if (Math.abs(dataPoint.min) > maxDataPoint)
      maxDataPoint = Math.abs(dataPoint.min);

    data.push(dataPoint);
  }

  // Normalize data
  if (maxDataPoint > 0) {
    const adjustmentFactor = 0.8 / maxDataPoint;
    data = data.map((dp) => ({
      max: dp.max * adjustmentFactor,
      min: dp.min * adjustmentFactor,
    }));
  }

  return data;
};

// Sample from fixed bars to dynamic width
export const sampleBarData = (
  fixedData: dataPoint[],
  targetBars: number,
  height: number
): dataPoint[] => {
  if (targetBars <= 0) return [];
  if (targetBars >= fixedData.length) return [...fixedData];

  const sampledData: dataPoint[] = [];
  const ratio = fixedData.length / targetBars;
  const amp = height / 2;

  for (let i = 0; i < targetBars; i++) {
    const sourceIndex = Math.floor(i * ratio);
    const nextIndex = Math.min(sourceIndex + 1, fixedData.length - 1);
    
    // Simple interpolation if we're between samples
    const t = (i * ratio) - sourceIndex;
    if (t > 0 && sourceIndex !== nextIndex) {
      const current = fixedData[sourceIndex];
      const next = fixedData[nextIndex];
      sampledData.push({
        max: (current.max * (1 - t) + next.max * t) * amp,
        min: (current.min * (1 - t) + next.min * t) * amp
      });
    } else {
      const source = fixedData[sourceIndex];
      sampledData.push({
        max: source.max * amp,
        min: source.min * amp
      });
    }
  }

  return sampledData;
};

// Process blob with caching
export const processAudioBlob = async (blob: Blob): Promise<{ leftData: dataPoint[], rightData: dataPoint[], duration: number }> => {
  // Check cache first
  const cached = audioCache.get(blob);
  if (cached) return cached;

  // Process blob
  const audioBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  
  return new Promise((resolve, reject) => {
    audioContext.decodeAudioData(audioBuffer, (buffer) => {
      const leftData = processAudioToFixedBars(buffer, 0);
      const rightData = buffer.numberOfChannels >= 2 
        ? processAudioToFixedBars(buffer, 1)
        : leftData;
      
      const result = { leftData, rightData, duration: buffer.duration };
      audioCache.set(blob, result);
      resolve(result);
    }, reject);
  });
};

// Legacy function for backward compatibility - now uses fixed bars + sampling
export const calculateBarData = (
  buffer: AudioBuffer,
  height: number,
  width: number,
  barWidth: number,
  gap: number,
  channel: number = 0
): dataPoint[] => {
  const fixedData = processAudioToFixedBars(buffer, channel);
  const targetBars = Math.floor(width / (barWidth + gap));
  return sampleBarData(fixedData, targetBars, height);
};

export const draw = (
  data: dataPoint[][],
  canvas: HTMLCanvasElement,
  barWidth: number,
  gap: number,
  backgroundColor: string,
  barColor: string,
  barPlayedColor?: string,
  currentTime: number = 0,
  duration: number = 1,
  barMuteColor?: string,
  muteChannel?: "off" | "left" | "right"
): void => {
  const amp = canvas.height / 2;

  const ctx = canvas.getContext("2d") as CustomCanvasRenderingContext2D;
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (backgroundColor !== "transparent") {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const playedPercent = (currentTime || 0) / duration;
  data.forEach(([left, right], i) => {
    const mappingPercent = i / data.length;
    const played = playedPercent > mappingPercent;
    const x = i * (barWidth + gap);
    const w = barWidth;

    // Left Channel (Top Bars). min - lowest point (-X), max - highest point (+X), amp - half canvas height, y - 0 is top
    const leftPower = (-left.min + left.max) / 2
    const topY = amp - leftPower;
    const topH = amp - topY + 1; // TODO: To keep 1?

    // Right Channel (Bottom Bars)
    const rightPower = (-right.min + right.max) / 2
    const btmY = amp;
    const btmH = rightPower;
    
    // Draw left channel (top bars)
    if (muteChannel === "left" && barMuteColor) {
      // Left channel is muted - use mute color without played color
      ctx.fillStyle = barMuteColor;
    } else {
      // Normal coloring for left channel
      ctx.fillStyle = played && barPlayedColor ? barPlayedColor : barColor;
    }
    
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, topY, w, topH, 50);
      ctx.fill();
    } else {
      ctx.fillRect(x, topY, w, topH);
    }
    
    // Draw right channel (bottom bars)
    if (muteChannel === "right" && barMuteColor) {
      // Right channel is muted - use mute color without played color
      ctx.fillStyle = barMuteColor;
    } else {
      // Normal coloring for right channel
      ctx.fillStyle = played && barPlayedColor ? barPlayedColor : barColor;
    }
    
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, btmY, w, btmH, 50);
      ctx.fill();
    } else {
      ctx.fillRect(x, btmY, w, btmH);
    }
  });
};
