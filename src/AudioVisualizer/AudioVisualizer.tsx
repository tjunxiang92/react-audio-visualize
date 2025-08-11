import {
  useRef,
  useState,
  forwardRef,
  type ForwardedRef,
  useImperativeHandle,
  useEffect,
} from "react";
import { type dataPoint } from "./types";
import { calculateBarData, draw } from "./utils";

interface Props {
  /**
   * Audio blob to visualize
   */
  blob: Blob;
  /**
   * Width of the visualizer. If not provided, will auto-resize to container width
   */
  width?: number;
  /**
   * Height of the visualizer. If not provided, will take full height of container
   */
  height?: number;
  /**
   * Width of each individual bar in the visualization. Default: `2`
   */
  barWidth?: number;
  /**
   * Gap between each bar in the visualization. Default: `1`
   */
  gap?: number;
  /**
   * BackgroundColor for the visualization: Default: `"transparent"`
   */
  backgroundColor?: string;
  /**
   * Color for the bars that have not yet been played: Default: `"rgb(184, 184, 184)""`
   */
  barColor?: string;
  /**
   * Color for the bars that have been played: Default: `"rgb(160, 198, 255)""`
   */
  barPlayedColor?: string;
  /**
   * Color for muted channel bars: Default: `"rgb(220, 220, 220)"`
   */
  barMuteColor?: string;
  /**
   * Which channel to mute: "off" (no mute), "left", or "right". Default: `"off"`
   */
  muteChannel?: "off" | "left" | "right";
  /**
   * Current time stamp till which the audio blob has been played.
   * Visualized bars that fall before the current time will have `barPlayerColor`, while that ones that fall after will have `barColor`
   */
  currentTime?: number;
  /**
   * Custome styles that can be passed to the visualization canvas
   */
  style?: React.CSSProperties;
  /**
   * A `ForwardedRef` for the `HTMLCanvasElement`
   */
  ref?: React.ForwardedRef<HTMLCanvasElement>;
  /**
   * Callback when user clicks on the waveform to seek. Returns the clicked time in seconds
   */
  onSeek?: (time: number) => void;
}

const AudioVisualizer = forwardRef<HTMLCanvasElement, Props>(
  (
    {
      blob,
      width: propWidth,
      height: propHeight,
      barWidth = 2,
      gap = 1,
      currentTime,
      style,
      backgroundColor = "transparent",
      barColor = "rgb(184, 184, 184)",
      barPlayedColor = "rgb(160, 198, 255)",
      barMuteColor = "rgb(220, 220, 220)",
      muteChannel = "off",
      onSeek
    }: Props,
    ref?: ForwardedRef<HTMLCanvasElement>
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [data, setData] = useState<dataPoint[][]>([]);
    const [duration, setDuration] = useState<number>(0);
    const [width, setWidth] = useState<number>(propWidth || 0);
    const [height, setHeight] = useState<number>(propHeight || 200);

    // Define updateDimensions function outside useEffect so it can be exposed
    const updateDimensions = () => {
      if (containerRef.current) {
        if (!propWidth) {
          setWidth(containerRef.current.offsetWidth);
        }
        if (!propHeight) {
          setHeight(containerRef.current.offsetHeight);
        }
      }
    };

    useImperativeHandle<HTMLCanvasElement | null, HTMLCanvasElement | null>(
      ref,
      () => canvasRef.current,
      []
    );

    // Handle container resize using ResizeObserver for width and height
    useEffect(() => {
      if (propWidth) {
        setWidth(propWidth);
      }
      if (propHeight) {
        setHeight(propHeight);
      }

      // Use ResizeObserver with debouncing for better performance
      if (!propWidth || !propHeight) {
        let resizeTimeout: NodeJS.Timeout;
        
        const resizeObserver = new ResizeObserver((entries) => {
          // Clear the previous timeout
          clearTimeout(resizeTimeout);
          
          // Debounce the resize handling
          resizeTimeout = setTimeout(() => {
            for (const entry of entries) {
              if (!propWidth) {
                const newWidth = entry.contentRect.width;
                if (newWidth > 0) setWidth(newWidth);
              }
              if (!propHeight) {
                const newHeight = entry.contentRect.height;
                if (newHeight > 0) setHeight(newHeight);
              }
            }
          }, 100); // 100ms debounce delay
        });

        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
          // Initial measurement
          updateDimensions();
        }

        return () => {
          clearTimeout(resizeTimeout);
          resizeObserver.disconnect();
        };
      }
    }, [propWidth, propHeight]);

    // Handle click for seeking
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSeek || !canvasRef.current || duration === 0) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const clickPercent = x / rect.width;
      const seekTime = clickPercent * duration;
      onSeek(seekTime);
    };

    useEffect(() => {
      const processBlob = async (): Promise<void> => {
        if (!canvasRef.current || !width || !height) return;

        if (!blob) {
          return;
        }

        const audioBuffer = await blob.arrayBuffer();
        const audioContext = new AudioContext();
        await audioContext.decodeAudioData(audioBuffer, (buffer) => {
          if (!canvasRef.current) return;
          setDuration(buffer.duration);
          
          // Mix channels or use mono
          const leftData = calculateBarData(
            buffer,
            height,
            width,
            barWidth,
            gap,
            0
          );
          const rightData = buffer.numberOfChannels >= 2 
            ? calculateBarData(
              buffer,
              height,
              width,
              barWidth,
              gap,
              1
            ) 
            : leftData;
          
          const zipped = leftData.map((left, index) => [left, rightData[index]]);
          setData(zipped);
        });
      };

      processBlob();
    }, [blob, width, height]);

    // Redraw when data changes
    useEffect(() => {
      if (!canvasRef.current || !width || !height) return;

      if (data.length > 0) {
        draw(
          data,
          canvasRef.current,
          barWidth,
          gap,
          backgroundColor,
          barColor,
          barPlayedColor,
          currentTime,
          duration,
          barMuteColor,
          muteChannel
        );
      }
    }, [currentTime, duration, width, height, data, barMuteColor, muteChannel]);

    const canvasElement = (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        style={{
          ...style,
          cursor: onSeek ? 'pointer' : 'default',
        }}
      />
    );

    if (!propWidth || !propHeight) {
      return (
        <div 
          ref={containerRef} 
          style={{ 
            width: propWidth ? `${propWidth}px` : '100%',
            height: propHeight ? `${propHeight}px` : '100%',
            position: 'relative'
          }}
        >
          {canvasElement}
        </div>
      );
    }

    return canvasElement;
  }
);

AudioVisualizer.displayName = "AudioVisualizer";

export { AudioVisualizer };
