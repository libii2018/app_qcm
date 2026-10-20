import { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { MediaContent } from '@qcm/shared';

export interface MediaPlayerProps {
  media: MediaContent;
  className?: string;
}

export function MediaPlayer({ media, className }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const getMediaUrl = (src: string): string => {
    // Handle different source types
    if (src.startsWith('http') || src.startsWith('https')) {
      return src;
    }
    if (src.startsWith('media/')) {
      // Relative path in zip
      return src;
    }
    if (src.startsWith('media:')) {
      // Media ID from API
      return `/api/media/${src.replace('media:', '')}`;
    }
    return src;
  };

  const handlePlayPause = () => {
    if (media.type === 'audio') {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play().catch(e => setError(e.message));
        }
        setIsPlaying(!isPlaying);
      }
    } else if (media.type === 'video') {
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
        } else {
          videoRef.current.play().catch(e => setError(e.message));
        }
        setIsPlaying(!isPlaying);
      }
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => {
    const target = e.target as HTMLAudioElement | HTMLVideoElement;
    setCurrentTime(target.currentTime);
    if (duration === 0 && !isNaN(target.duration)) {
      setDuration(target.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) audioRef.current.volume = vol;
    if (videoRef.current) videoRef.current.volume = vol;
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) audioRef.current.muted = newMuted;
    if (videoRef.current) videoRef.current.muted = newMuted;
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  // Reset playing state when media changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [media.id, media.src]);

  if (error) {
    return (
      <div className={cn('text-red-500 p-2 rounded', className)}>
        Erreur: {error}
      </div>
    );
  }

  switch (media.type) {
    case 'image':
      return (
        <figure className={cn('relative', className)}>
          <img
            ref={imgRef}
            src={getMediaUrl(media.src)}
            alt={media.altText || 'Image du quiz'}
            className="w-full h-auto rounded-lg object-cover max-h-64"
            onError={() => setError('Impossible de charger l\'image')}
          />
          {media.altText && (
            <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {media.altText}
            </figcaption>
          )}
        </figure>
      );

    case 'audio':
      return (
        <div className={cn('bg-gray-100 dark:bg-gray-800 rounded-lg p-3', className)}>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={handlePlayPause}
              className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l2 2" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.383 11.383a1 1 0 010-1.414l2.121-2.122a1 1 0 011.414 0l2.121 2.122a1 1 0 01-1.414 1.414L13 12l-2.121 2.122z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l2 2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-2 2m0 0l-2 2m2-2l-2-2" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
              />
            </div>
            <div className="flex items-center gap-1">
              {[0.5, 1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handlePlaybackRateChange(rate)}
                  className={`px-2 py-1 text-xs rounded ${playbackRate === rate ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
          <audio
            ref={audioRef}
            src={getMediaUrl(media.src)}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={() => setError('Impossible de charger l\'audio')}
            volume={volume}
            playbackRate={playbackRate}
          />
        </div>
      );

    case 'video':
      return (
        <div className={cn('bg-gray-900 rounded-lg overflow-hidden', className)}>
          <video
            ref={videoRef}
            src={getMediaUrl(media.src)}
            className="w-full max-h-64"
            controls
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={() => setError('Impossible de charger la vidéo')}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          {media.altText && (
            <div className="p-3 bg-gray-100 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-300">{media.altText}</p>
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}
