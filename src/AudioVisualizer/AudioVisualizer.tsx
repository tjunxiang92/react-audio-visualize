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
   * Height of the visualizer
   */
  height: number;
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
      height,
      barWidth = 2,
      gap = 1,
      currentTime,
      style,
      backgroundColor = "transparent",
      barColor = "rgb(184, 184, 184)",
      barPlayedColor = "rgb(160, 198, 255)",
      onSeek
    }: Props,
    ref?: ForwardedRef<HTMLCanvasElement>
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [data, setData] = useState<dataPoint[][]>([]);
    const [duration, setDuration] = useState<number>(0);
    const [width, setWidth] = useState<number>(propWidth || 0);

    useImperativeHandle<HTMLCanvasElement | null, HTMLCanvasElement | null>(
      ref,
      () => canvasRef.current,
      []
    );

    // Handle window resize
    useEffect(() => {
      if (propWidth) {
        setWidth(propWidth);
        return;
      }

      const updateWidth = () => {
        if (containerRef.current) {
          setWidth(containerRef.current.offsetWidth);
        }
      };

      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }, [propWidth]);

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
        if (!canvasRef.current || !width) return;

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
    }, [blob, width]);

    // Redraw when data changes
    useEffect(() => {
      if (!canvasRef.current || !width) return;

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
          duration
        );
      }
    }, [currentTime, duration, width, data]);

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

    if (!propWidth) {
      return (
        <div ref={containerRef} style={{ width: '100%' }}>
          {canvasElement}
        </div>
      );
    }

    return canvasElement;
  }
);

AudioVisualizer.displayName = "AudioVisualizer";

export { AudioVisualizer };
