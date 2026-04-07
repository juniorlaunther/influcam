/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Video, 
  Settings, 
  Type, 
  Layers, 
  Mic, 
  MicOff, 
  Timer, 
  Grid, 
  FlipHorizontal, 
  Pause, 
  Play, 
  Square, 
  ChevronRight, 
  FolderOpen,
  FileText,
  Clock,
  Zap,
  MoreVertical,
  Monitor,
  Smartphone,
  Layout,
  User,
  Music,
  Eye,
  EyeOff,
  Share,
  Download,
  PlusSquare,
  ExternalLink,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { CameraMode, Project, RecordingSettings } from './types';

export default function App() {
  const [mode, setMode] = useState<CameraMode>('normal');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedCamera2, setSelectedCamera2] = useState<string>(''); // For Dual/React
  const [settings, setSettings] = useState<RecordingSettings>({
    timer: 0,
    showGuides: false,
    mirrorFront: true,
    autoDateTime: true,
    projectName: 'Meu Projeto',
    fileName: 'Video_InfluCam',
    showProjectName: true
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [teleprompterText, setTeleprompterText] = useState('Bem-vindo ao InfluCam! Este é o seu teleprompter. Você pode ajustar a velocidade e o tamanho do texto aqui.');
  const [showScript, setShowScript] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // PWA States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Detect Safari (specifically on iOS)
    const isSafariBrowser = /safari/.test(userAgent) && !/chrome|crios|fxios|opr|mercury/i.test(userAgent);
    setIsSafari(isSafariBrowser);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) return;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioSource, setAudioSource] = useState<'internal' | 'external'>('internal');
  const [mainStream, setMainStream] = useState<MediaStream | null>(null);
  
  // Orientation tracking
  const [mainOrientation, setMainOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  
  useEffect(() => {
    const resumeAudio = () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };
    window.addEventListener('click', resumeAudio);
    return () => window.removeEventListener('click', resumeAudio);
  }, []);

  // Overlay Settings
  const [overlayOrientation, setOverlayOrientation] = useState<'vertical' | 'horizontal'>('horizontal');
  const [overlayAspectRatio, setOverlayAspectRatio] = useState<number>(16/9);
  const [overlayRatioLabel, setOverlayRatioLabel] = useState<string>('16:9');
  const [showOverlaySettings, setShowOverlaySettings] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState({ x: 20, y: 80 });
  const [hasManuallySetOverlayOrientation, setHasManuallySetOverlayOrientation] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaRecorderRef2 = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunksRef2 = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const getSupportedMimeType = () => {
    const types = [
      'video/mp4;codecs=avc1,mp3',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=avc1,aac',
      'video/mp4;codecs=avc1',
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=h264,mp3',
      'video/webm;codecs=h264,aac',
      'video/webm;codecs=h264',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'video/webm';
  };

  const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLVideoElement, w: number, h: number, x: number = 0, y: number = 0) => {
    if (!img || img.readyState < 2 || img.videoWidth === 0 || img.videoHeight === 0) return;
    
    const imgW = img.videoWidth;
    const imgH = img.videoHeight;

    const imgRatio = imgW / imgH;
    const canvasRatio = w / h;
    let sX, sY, sW, sH;

    if (imgRatio > canvasRatio) {
      sH = imgH;
      sW = imgH * canvasRatio;
      sX = (imgW - sW) / 2;
      sY = 0;
    } else {
      sW = imgW;
      sH = imgW / canvasRatio;
      sX = 0;
      sY = (imgH - sH) / 2;
    }
    
    // Ensure source coordinates and dimensions are integers and within bounds
    const finalSX = Math.max(0, Math.floor(sX));
    const finalSY = Math.max(0, Math.floor(sY));
    const finalSW = Math.min(imgW - finalSX, Math.floor(sW));
    const finalSH = Math.min(imgH - finalSY, Math.floor(sH));
    
    if (finalSW > 0 && finalSH > 0) {
      ctx.drawImage(
        img, 
        finalSX, 
        finalSY, 
        finalSW, 
        finalSH, 
        Math.floor(x), 
        Math.floor(y), 
        Math.floor(w), 
        Math.floor(h)
      );
    }
  };

  // Initialize cameras
  useEffect(() => {
    const getDevices = async () => {
      try {
        // First, try to get permission to ensure labels are available
        await navigator.mediaDevices.getUserMedia({ video: true });
        
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
          if (videoDevices.length > 1) {
            setSelectedCamera2(videoDevices[1].deviceId);
          } else {
            setSelectedCamera2(videoDevices[0].deviceId);
          }
        }
      } catch (err) {
        console.error('Error accessing devices:', err);
        // Fallback: try to enumerate anyway
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length > 0) setDevices(videoDevices);
      }
    };
    getDevices();
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  // Setup stream
  const setupStream = useCallback(async (deviceId: string, targetRef: React.RefObject<HTMLVideoElement | null>, forceOrientation?: 'vertical' | 'horizontal', includeAudio: boolean = true) => {
    try {
      const isVertical = forceOrientation ? forceOrientation === 'vertical' : window.innerHeight > window.innerWidth;
      
      // Stop existing tracks if any
      if (targetRef.current?.srcObject) {
        const oldStream = targetRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach(track => track.stop());
      }

      // Find the device to check if it's front or back (optional hint)
      const device = devices.find(d => d.deviceId === deviceId);
      const isFront = device ? device.label.toLowerCase().includes('front') || device.label.toLowerCase().includes('frontal') : true;

      const videoConstraints: any = {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        facingMode: deviceId ? undefined : (isFront ? 'user' : 'environment'),
        width: { ideal: isVertical ? 720 : 1280 },
        height: { ideal: isVertical ? 1280 : 720 }
      };

      const constraints: MediaStreamConstraints = {
        video: videoConstraints,
        audio: includeAudio
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (targetRef === videoRef) {
        setMainStream(stream);
      }

      // Log actual settings for debugging
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      console.log(`Stream for ${targetRef === videoRef ? 'Main' : 'Overlay'} initialized:`, settings.width, 'x', settings.height, 'Orientation:', isVertical ? 'Vertical' : 'Horizontal');

      if (targetRef.current) {
        targetRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Error setting up stream:', err);
      // Fallback to basic constraints if ideal fails
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: deviceId ? { deviceId: { ideal: deviceId } } : true, 
          audio: includeAudio 
        });
        if (targetRef.current) targetRef.current.srcObject = stream;
        return stream;
      } catch (e) {
        console.error('Critical error setting up stream:', e);
        return null;
      }
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const isVertical = window.innerHeight > window.innerWidth;
      const newMainOrientation = isVertical ? 'vertical' : 'horizontal';
      setMainOrientation(newMainOrientation);
      
      // Rule 2: Dual/React mode default orientation is opposite to main
      if (!hasManuallySetOverlayOrientation) {
        const newOverlayOrientation = newMainOrientation === 'vertical' ? 'horizontal' : 'vertical';
        setOverlayOrientation(newOverlayOrientation);
        setOverlayAspectRatio(newOverlayOrientation === 'vertical' ? 9/16 : 16/9);
        setOverlayRatioLabel(newOverlayOrientation === 'vertical' ? '9:16' : '16:9');
      }

      setupStream(selectedCamera, videoRef, undefined, true);
      if (mode === 'dual' || mode === 'react') {
        setupStream(selectedCamera2, videoRef2, overlayOrientation, false);
      }
    };
    
    handleResize(); // Initial setup

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedCamera, selectedCamera2, mode, setupStream, overlayOrientation, hasManuallySetOverlayOrientation]);

  // Audio monitoring
  useEffect(() => {
    if (!mainStream) return;

    const audioTrack = mainStream.getAudioTracks()[0];
    if (!audioTrack) return;

    setAudioSource(audioTrack.label.toLowerCase().includes('external') ? 'external' : 'internal');
    
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let source: MediaStreamAudioSourceNode;
    let animationFrame: number;

    const startAudio = async () => {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source = audioContextRef.current.createMediaStreamSource(mainStream);
      source.connect(analyserRef.current);

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.fftSize);
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        // Calculate RMS from time domain data for better responsiveness
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        
        // Scale and boost for UI visibility (speech is often low amplitude)
        const level = Math.min(rms * 100 * 5, 100);
        setAudioLevel(level);
        
        animationFrame = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    };

    startAudio();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [mainStream]);

  const startRecording = async () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    
    // Ensure we have the latest rects before starting
    if (overlayRef.current) setOverlayRect(overlayRef.current.getBoundingClientRect());
    
    const isMainVertical = mainOrientation === 'vertical';
    const isOverlayVertical = overlayOrientation === 'vertical';

    // Setup Canvases for forced orientation recording
    const canvas1 = document.createElement('canvas');
    const canvas2 = document.createElement('canvas');
    
    // Use willReadFrequently for better performance with frequent drawImage from video
    const ctx1 = canvas1.getContext('2d', { alpha: false, willReadFrequently: true });
    const ctx2 = canvas2.getContext('2d', { alpha: false, willReadFrequently: true });
    
    if (!ctx1 || !ctx2) return;

    canvas1.width = isMainVertical ? 1080 : 1920;
    canvas1.height = isMainVertical ? 1920 : 1080;
    
    // For Dual mode, use the specific overlay aspect ratio
    if (mode === 'dual') {
      if (overlayAspectRatio > 1) {
        canvas2.width = 1920;
        canvas2.height = 1920 / overlayAspectRatio;
      } else {
        canvas2.height = 1920;
        canvas2.width = 1920 * overlayAspectRatio;
      }
    } else if (mode === 'react') {
      // In React mode, canvas2 acts as a stable buffer for the popup
      // to prevent flickering/black frames from direct video-to-canvas draws
      canvas2.width = 1080;
      canvas2.height = 1080;
    }

    // Drawing loop
    const draw = () => {
      // Draw Main
      if (videoRef.current && videoRef.current.readyState >= 2) {
        ctx1.save();
        if (settings.mirrorFront) {
          ctx1.translate(canvas1.width, 0);
          ctx1.scale(-1, 1);
        }
        drawImageCover(ctx1, videoRef.current, canvas1.width, canvas1.height);
        ctx1.restore();
      }

      // Draw Secondary
      const isVideo2Ready = videoRef2.current && 
                           videoRef2.current.readyState >= 2 && 
                           videoRef2.current.videoWidth > 0;

      if ((mode === 'dual' || mode === 'react') && isVideo2Ready && videoRef2.current) {
        if (mode === 'react') {
          // Rule 3: React mode composition - draw secondary on top of main
          const currentOverlayRect = overlayRef.current?.getBoundingClientRect();
          const currentContainerRect = containerRef.current?.getBoundingClientRect();
          
          if (currentOverlayRect && currentContainerRect && currentContainerRect.width > 0) {
            // Map screen coordinates to canvas coordinates
            const scaleX = canvas1.width / currentContainerRect.width;
            const scaleY = canvas1.height / currentContainerRect.height;
            
            const destX = Math.max(0, Math.floor((currentOverlayRect.left - currentContainerRect.left) * scaleX));
            const destY = Math.max(0, Math.floor((currentOverlayRect.top - currentContainerRect.top) * scaleY));
            
            const baseSize = overlayAspectRatio > 1 ? 224 : 128;
            const destW = Math.max(1, Math.floor(baseSize * scaleX));
            const destH = Math.max(1, Math.floor(destW / overlayAspectRatio));
            
            // 1. Draw video to buffer canvas first (fixes flickering in some browsers)
            drawImageCover(ctx2, videoRef2.current, destW, destH);
            
            // 2. Draw buffer to main canvas with clipping
            ctx1.save();
            // Draw a small border/shadow for the overlay in the canvas
            ctx1.shadowColor = 'rgba(0,0,0,0.5)';
            ctx1.shadowBlur = 20;
            ctx1.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx1.lineWidth = 4;
            
            // Clip to rounded corners
            ctx1.beginPath();
            const radius = 20 * scaleX;
            ctx1.moveTo(destX + radius, destY);
            ctx1.lineTo(destX + destW - radius, destY);
            ctx1.quadraticCurveTo(destX + destW, destY, destX + destW, destY + radius);
            ctx1.lineTo(destX + destW, destY + destH - radius);
            ctx1.quadraticCurveTo(destX + destW, destY + destH, destX + destW - radius, destY + destH);
            ctx1.lineTo(destX + radius, destY + destH);
            ctx1.quadraticCurveTo(destX, destY + destH, destX, destY + destH - radius);
            ctx1.lineTo(destX, destY + radius);
            ctx1.quadraticCurveTo(destX, destY, destX + radius, destY);
            ctx1.closePath();
            ctx1.clip();
            
            // Draw the buffer content
            ctx1.drawImage(canvas2, 0, 0, destW, destH, destX, destY, destW, destH);
            ctx1.restore();
          }
        } else {
          // Dual mode - separate canvas
          drawImageCover(ctx2, videoRef2.current, canvas2.width, canvas2.height);
        }
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Start drawing
    setIsRecording(true);
    requestAnimationFrame(draw);

    // Capture Streams from Canvases
    const stream1 = canvas1.captureStream(30);
    const stream2 = canvas2.captureStream(30);

    // Add Audio to Canvas Streams
    const audioStream = videoRef.current.srcObject as MediaStream;
    audioStream.getAudioTracks().forEach(track => {
      stream1.addTrack(track.clone());
      stream2.addTrack(track.clone());
    });

    // Setup Recorders
    const mimeType = getSupportedMimeType();
    // Prefer mp4 extension if possible
    const extension = (mimeType.includes('mp4') || mimeType.includes('h264') || mimeType.includes('avc1')) ? 'mp4' : 'webm';
    
    const mediaRecorder1 = new MediaRecorder(stream1, { 
      mimeType, 
      videoBitsPerSecond: 5000000 
    });
    mediaRecorderRef.current = mediaRecorder1;
    chunksRef.current = [];
    mediaRecorder1.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mediaRecorder1.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = settings.autoDateTime ? `-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}` : '';
      const filename = `${settings.projectName}-${settings.fileName}${timestamp}.${extension}`;
      a.href = url;
      a.download = filename;
      a.click();
    };

    mediaRecorder1.start();

    // Rule 3: Only Dual mode exports a second file
    if (mode === 'dual' && videoRef2.current && videoRef2.current.readyState >= 2) {
      const mediaRecorder2 = new MediaRecorder(stream2, { 
        mimeType, 
        videoBitsPerSecond: 5000000 
      });
      mediaRecorderRef2.current = mediaRecorder2;
      chunksRef2.current = [];
      mediaRecorder2.ondataavailable = (e) => { if (e.data.size > 0) chunksRef2.current.push(e.data); };
      mediaRecorder2.onstop = () => {
        const blob = new Blob(chunksRef2.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = settings.autoDateTime ? `-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}` : '';
        const filename = `${settings.projectName}-${settings.fileName}-SECUNDARIO${timestamp}.${extension}`;
        a.href = url;
        a.download = filename;
        a.click();
      };
      mediaRecorder2.start();
    }

    setIsPaused(false);
    setRecordingTime(0);
    timerIntervalRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (mediaRecorderRef2.current) {
      mediaRecorderRef2.current.stop();
    }
    setIsPaused(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        if (mediaRecorderRef2.current) mediaRecorderRef2.current.resume();
        setIsPaused(false);
        timerIntervalRef.current = window.setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (mediaRecorderRef2.current) mediaRecorderRef2.current.pause();
        setIsPaused(true);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const switchCamera = () => {
    const currentIndex = devices.findIndex(d => d.deviceId === selectedCamera);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedCamera(devices[nextIndex].deviceId);
  };

  const [overlayFile, setOverlayFile] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);

  const handleOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setOverlayFile(url);
    }
  };

  const hasCycledRef = useRef(false);
  const [overlayRect, setOverlayRect] = useState<DOMRect | null>(null);

  const cycleOverlayRatio = (direction: number = 1) => {
    if (mode !== 'react') return;
    const ratios = [
      { label: '16:9', value: 16/9 },
      { label: '9:16', value: 9/16 },
      { label: '1:1', value: 1 },
      { label: '3:4', value: 3/4 },
      { label: '4:3', value: 4/3 }
    ];
    const currentIndex = ratios.findIndex(r => r.label === overlayRatioLabel);
    let nextIndex = (currentIndex + direction) % ratios.length;
    if (nextIndex < 0) nextIndex = ratios.length - 1;
    
    setOverlayRatioLabel(ratios[nextIndex].label);
    setOverlayAspectRatio(ratios[nextIndex].value);
    setOverlayOrientation(ratios[nextIndex].value < 1 ? 'vertical' : 'horizontal');
    setHasManuallySetOverlayOrientation(true);
  };

  const cycleOverlayCamera = () => {
    const currentIndex = devices.findIndex(d => d.deviceId === selectedCamera2);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedCamera2(devices[nextIndex].deviceId);
  };

  return (
    <div className="relative h-screen w-screen bg-black flex flex-col overflow-hidden font-sans">
      {/* Camera Preview Area */}
      <div className={cn(
        "relative flex-1 w-full bg-black overflow-hidden flex items-center justify-center",
        mainOrientation === 'vertical' ? "px-0 py-2 sm:py-4" : "py-0 px-2 sm:px-4"
      )}>
        {/* Composition Area (Safe Area) */}
        <div 
          ref={containerRef}
          className={cn(
            "relative bg-neutral-900 shadow-2xl overflow-hidden",
            mainOrientation === 'vertical' 
              ? "w-full aspect-[9/16]" 
              : "h-full aspect-[16/9]"
          )}
        >
          {/* Main Camera */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-transform duration-500",
              settings.mirrorFront && "scale-x-[-1]"
            )}
          />

          {/* Overlay Reference */}
          {mode === 'overlay' && overlayFile && (
            <div 
              className="absolute inset-0 z-15 pointer-events-none"
              style={{ opacity: overlayOpacity }}
            >
              {overlayFile.includes('video') || overlayFile.startsWith('blob:') ? (
                <video src={overlayFile} autoPlay muted loop className="w-full h-full object-cover" />
              ) : (
                <img src={overlayFile} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              )}
            </div>
          )}

          {/* Overlay Controls */}
          {mode === 'overlay' && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4 w-64">
              {!overlayFile ? (
                <label className="liquid-glass px-6 py-3 rounded-full cursor-pointer flex items-center gap-2 text-sm font-bold tracking-tight hover:bg-white/10 transition-all">
                  <Layers size={18} />
                  Escolher Referência
                  <input type="file" accept="video/*,image/*" className="hidden" onChange={handleOverlayUpload} />
                </label>
              ) : (
                <div className="w-full space-y-3 p-4 rounded-3xl liquid-glass">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-60">
                    <span>Opacidade</span>
                    <span>{Math.round(overlayOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={overlayOpacity} 
                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                    className="w-full accent-[#f51492] h-1 rounded-full appearance-none bg-white/10"
                  />
                  <button 
                    onClick={() => setOverlayFile(null)}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#f51492] w-full text-center hover:text-[#f51492]/80 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Dual / React Overlay */}
          {(mode === 'dual' || mode === 'react') && (
            <div className="absolute inset-0 pointer-events-none z-50">
              <motion.div 
                ref={overlayRef}
                drag
                dragMomentum={false}
                dragConstraints={containerRef}
                dragElastic={0}
                initial={{ opacity: 0, scale: 0.8, x: 20, y: 80 }}
                animate={{ opacity: 1, scale: 1 }}
                onDragEnd={(_, info) => {
                  setOverlayPosition({ x: info.point.x, y: info.point.y });
                  if (overlayRef.current) {
                    setOverlayRect(overlayRef.current.getBoundingClientRect());
                  }
                }}
                onDrag={() => {
                  if (overlayRef.current) {
                    setOverlayRect(overlayRef.current.getBoundingClientRect());
                  }
                }}
                style={{ 
                  width: overlayAspectRatio > 1 ? 224 : 128,
                  height: (overlayAspectRatio > 1 ? 224 : 128) / overlayAspectRatio
                }}
                className="absolute pointer-events-auto overflow-visible border-2 border-white/30 shadow-2xl touch-none rounded-2xl bg-neutral-800"
              >
                <div className="w-full h-full overflow-hidden rounded-2xl relative">
                  <video
                    ref={videoRef2}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Internal Controls (Top Right) */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2 z-30">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (overlayRef.current) {
                          setOverlayRect(overlayRef.current.getBoundingClientRect());
                        }
                        setShowOverlaySettings(!showOverlaySettings);
                      }}
                      className={cn(
                        "p-1.5 rounded-full transition-all liquid-glass",
                        showOverlaySettings ? "bg-[#f51492] text-white border-[#f51492]" : "text-white/80 hover:bg-white/20"
                      )}
                    >
                      <Settings size={14} />
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleOverlayCamera();
                      }}
                      className="p-1.5 rounded-full liquid-glass text-white/80 hover:bg-white/20"
                    >
                      <FlipHorizontal size={14} />
                    </button>
                  </div>

                  {/* Draggable Resize Handle (React Mode Only) */}
                  {mode === 'react' && (
                    <motion.div 
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.1}
                      dragMomentum={false}
                      onDrag={(_, info) => {
                        // If dragged significantly, cycle ratio
                        if (Math.abs(info.offset.x) > 40 && !hasCycledRef.current) {
                          cycleOverlayRatio(info.offset.x > 0 ? 1 : -1);
                          hasCycledRef.current = true;
                        } else if (Math.abs(info.offset.x) < 15) {
                          hasCycledRef.current = false;
                        }
                      }}
                      onDragEnd={() => {
                        hasCycledRef.current = false;
                      }}
                      className={cn(
                        "absolute bottom-2 z-20 flex items-center justify-center cursor-ew-resize active:scale-110 transition-transform",
                        // Position on the side with more space
                        ((overlayRect?.left ?? overlayPosition.x) + (overlayRect?.width ?? (overlayAspectRatio > 1 ? 224 : 128)) / 2) > window.innerWidth / 2 ? "left-2" : "right-2"
                      )}
                    >
                      <div className={cn(
                        "w-[26px] h-[26px] rounded-full liquid-glass flex items-center justify-center border border-white/30 shadow-lg",
                        ((overlayRect?.left ?? overlayPosition.x) + (overlayRect?.width ?? (overlayAspectRatio > 1 ? 224 : 128)) / 2) > window.innerWidth / 2 ? "rounded-tr-xl" : "rounded-tl-xl"
                      )}>
                        <div className="flex gap-0.5">
                          <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                          <div className="w-0.5 h-3 bg-white/80 rounded-full" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Overlay Settings Menu (External) */}
                <AnimatePresence>
                  {showOverlaySettings && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, x: (overlayRect?.left || overlayPosition.x) > window.innerWidth / 2 ? -20 : 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: (overlayRect?.left || overlayPosition.x) > window.innerWidth / 2 ? -20 : 20 }}
                      className={cn(
                        "absolute liquid-glass p-3 rounded-2xl flex flex-col gap-3 min-w-[160px] z-[60] shadow-2xl",
                        // Determine side based on space
                        (overlayRect?.left || overlayPosition.x) > window.innerWidth / 2 
                          ? "right-[calc(100%+12px)] top-0" // Open left
                          : "left-[calc(100%+12px)] top-0", // Open right
                        // Fallback to bottom if too close to edges
                        ((overlayRect?.left || 0) < 180 && (window.innerWidth - (overlayRect?.right || 0)) < 180) && "left-1/2 -translate-x-1/2 top-[calc(100%+12px)]"
                      )}
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Proporção</span>
                        <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded">{overlayRatioLabel}</span>
                      </div>
                      
                      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                        {['16:9', '9:16', '1:1', '3:4', '4:3'].map((ratio) => (
                          <button
                            key={ratio}
                            onClick={() => {
                              const val = ratio === '16:9' ? 16/9 : ratio === '9:16' ? 9/16 : ratio === '1:1' ? 1 : ratio === '3:4' ? 3/4 : 4/3;
                              setOverlayRatioLabel(ratio);
                              setOverlayAspectRatio(val);
                              setOverlayOrientation(val < 1 ? 'vertical' : 'horizontal');
                              setHasManuallySetOverlayOrientation(true);
                            }}
                            className={cn(
                              "text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap transition-colors",
                              overlayRatioLabel === ratio ? "bg-[#f51492] text-white" : "bg-white/5 hover:bg-white/10"
                            )}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>

                      <div className="h-[1px] bg-white/10" />
                      
                      <button 
                        onClick={cycleOverlayCamera}
                        className="flex items-center justify-between text-[10px] font-bold uppercase p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Próxima Câmera</span>
                        <Camera size={12} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )}

          {/* Framing Guides */}
          {settings.showGuides && (
            <div className="absolute inset-0 pointer-events-none z-20">
              <div className="grid grid-cols-3 grid-rows-3 h-full w-full">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="border-[0.5px] border-white/20" />
                ))}
              </div>
            </div>
          )}

          {/* Teleprompter Overlay */}
          <AnimatePresence>
            {showTeleprompter && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-x-0 top-24 z-30 px-8 pointer-events-none"
              >
                <div className="liquid-glass rounded-[32px] p-8 max-h-80 overflow-hidden relative pointer-events-auto">
                  <motion.div
                    animate={{ y: isRecording ? -800 : 0 }}
                    transition={{ duration: 60, ease: "linear", repeat: Infinity }}
                    className="text-2xl font-semibold leading-relaxed text-center text-white/90 tracking-tight"
                  >
                    {teleprompterText}
                  </motion.div>
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top Status Bar (Floating Island) */}
          <div className="absolute top-6 inset-x-0 px-4 flex items-center justify-center gap-2.5 z-40">
            <div className="liquid-glass px-4 py-2 rounded-full flex items-center gap-2.5 shadow-xl border border-white/10">
              <div className={cn("w-2 h-2 rounded-full", isRecording ? "bg-[#f51492] animate-pulse shadow-[0_0_8px_rgba(245,20,146,0.6)]" : "bg-white/20")} />
              <span className="text-[11px] font-mono font-bold tracking-tighter">{isRecording ? formatTime(recordingTime) : "00:00"}</span>
            </div>
            
            <div className="liquid-glass px-4 py-2 rounded-full flex items-center gap-3 shadow-xl border border-white/10 flex-1 max-w-[160px]">
              <Mic size={14} className={cn(
                audioLevel > 85 ? "text-[#f51492]" : (audioLevel > 2 ? "text-green-400" : "text-white/60")
              )} />
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className={cn(
                    "h-full transition-colors duration-200",
                    audioLevel > 85 ? "bg-[#f51492] shadow-[0_0_8px_rgba(245,20,146,0.6)]" : "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]"
                  )}
                  animate={{ width: `${audioLevel}%` }}
                  transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{audioSource}</span>
            </div>

            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 rounded-full liquid-glass hover:bg-white/10 transition-all shadow-xl border border-white/10"
            >
              <Settings size={18} />
            </button>
          </div>

          {/* Right Side Quick Actions */}
          <AnimatePresence>
            {showControls && (
              <motion.div 
                initial={{ opacity: 0, x: isLandscape ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLandscape ? -20 : 20 }}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40",
                  isLandscape ? "left-6" : "right-6"
                )}
              >
                {/* Lens Switcher - Now in right column (Portrait) or left column (Landscape) */}
                <button 
                  onClick={() => {
                    const currentIndex = devices.findIndex(d => d.deviceId === selectedCamera);
                    const nextIndex = (currentIndex + 1) % devices.length;
                    setSelectedCamera(devices[nextIndex].deviceId);
                  }}
                  className="w-14 h-14 rounded-full liquid-glass flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-all border border-white/10"
                >
                  <div className={cn("flex flex-col items-center transition-transform duration-500")}>
                    <Camera size={18} />
                    <span className="text-[10px] font-black tracking-tighter uppercase">
                      {(() => {
                        const device = devices.find(d => d.deviceId === selectedCamera);
                        const index = devices.findIndex(d => d.deviceId === selectedCamera);
                        if (!device) return '1x';
                        return device.label.toLowerCase().includes('0.5') ? '0.5x' : 
                               device.label.toLowerCase().includes('wide') ? '0.5x' :
                               index === 0 ? '1x' : 
                               index === 1 ? '2x' : `${index + 1}x`;
                      })()}
                    </span>
                  </div>
                </button>

                <button 
                  onClick={() => setShowTeleprompter(!showTeleprompter)}
                  className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl border", showTeleprompter ? "bg-[#f51492] text-white border-[#f51492]" : "liquid-glass border-white/10 hover:bg-white/10")}
                >
                  <div className={cn("transition-transform duration-500")}>
                    <Type size={22} />
                  </div>
                </button>
                <button 
                  onClick={() => setShowScript(!showScript)}
                  className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl border", showScript ? "bg-[#f51492] text-white border-[#f51492]" : "liquid-glass border-white/10 hover:bg-white/10")}
                >
                  <div className={cn("transition-transform duration-500")}>
                    <FileText size={22} />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Controls Area (Floating Pill) */}
      <div className={cn(
        "absolute z-50 pointer-events-none transition-all duration-500",
        isLandscape 
          ? "inset-y-0 right-8 flex items-center" 
          : "bottom-8 inset-x-0 px-6 safe-area-bottom"
      )}>
        <div className={cn(
          "mx-auto flex items-center pointer-events-auto transition-all duration-500",
          isLandscape ? "flex-row gap-8" : "max-w-xl flex-col gap-6"
        )}>
          {/* Mode Selector Pill */}
          <AnimatePresence>
            {showControls && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={cn(
                  "liquid-glass-dark px-2 py-1.5 rounded-full flex items-center gap-1 shadow-2xl border border-white/5 transition-all duration-500",
                  isLandscape ? "fixed bottom-8 left-1/2 -translate-x-1/2" : ""
                )}
              >
                {(['normal', 'dual', 'react', 'overlay'] as CameraMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      mode === m ? "bg-white text-black shadow-lg scale-105" : "text-white/40 hover:text-white/60"
                    )}
                  >
                    <div className="transition-transform duration-500">
                      {m}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Recording Controls Island */}
          <div className={cn(
            "flex items-center justify-between liquid-glass-dark shadow-2xl border border-white/5 transition-all duration-500",
            isLandscape 
              ? "flex-col-reverse py-6 px-3 rounded-[32px] h-[280px] w-auto" 
              : "w-full p-3 rounded-[32px]"
          )}>
            <button 
              onClick={isRecording ? togglePause : () => setShowControls(!showControls)}
              className={cn(
                "p-3 rounded-full liquid-glass transition-all",
                isRecording ? "bg-white/10 text-white" : (showControls ? "text-white/60 hover:bg-white/10" : "bg-[#f51492] text-white shadow-lg")
              )}
            >
              <div className="transition-transform duration-500">
                {isRecording ? (
                  isPaused ? <Play fill="currentColor" size={20} /> : <Pause fill="currentColor" size={20} />
                ) : (
                  showControls ? <Eye size={20} /> : <EyeOff size={20} />
                )}
              </div>
            </button>

            <div className="flex items-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "rounded-full flex items-center justify-center transition-all duration-500 relative group",
                  isLandscape ? "w-14 h-14" : "w-16 h-16",
                  isRecording ? "bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "bg-[#f51492] shadow-[0_0_20px_rgba(245,20,146,0.3)]"
                )}
              >
                <div className={cn(
                  "transition-all duration-500",
                  isRecording ? "w-6 h-6 rounded-md bg-[#f51492]" : "w-8 h-8 rounded-full bg-white"
                )} />
                {!isRecording && (
                  <div className="absolute inset-0 rounded-full border-4 border-white/30 scale-110 group-active:scale-100 transition-transform" />
                )}
              </button>
            </div>

            <button 
              onClick={switchCamera}
              className="p-3 rounded-full liquid-glass hover:bg-white/10 transition-all text-white/60"
            >
              <div className="transition-transform duration-500">
                <FlipHorizontal size={20} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl p-8 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Configurações</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 glass-morphism rounded-full">
                <ChevronRight className="rotate-90" />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto flex-1 no-scrollbar">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Arquivo</label>
                <div className="liquid-glass rounded-3xl p-6 space-y-6">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Nome do Projeto</span>
                    <input 
                      type="text" 
                      value={settings.projectName}
                      onChange={(e) => setSettings(s => ({ ...s, projectName: e.target.value }))}
                      className="bg-transparent border-b border-white/10 py-2 focus:outline-none focus:border-[#f51492] transition-colors text-lg font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Nome do Vídeo</span>
                    <input 
                      type="text" 
                      value={settings.fileName}
                      onChange={(e) => setSettings(s => ({ ...s, fileName: e.target.value }))}
                      className="bg-transparent border-b border-white/10 py-2 focus:outline-none focus:border-[#f51492] transition-colors text-lg font-medium"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Data/Hora automática</span>
                    <button 
                      onClick={() => setSettings(s => ({ ...s, autoDateTime: !s.autoDateTime }))}
                      className={cn("w-14 h-8 rounded-full transition-all relative", settings.autoDateTime ? "bg-[#f51492]" : "bg-white/10")}
                    >
                      <div className={cn("absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-all", settings.autoDateTime ? "left-7" : "left-1")} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Exibir Nome do Projeto</span>
                    <button 
                      onClick={() => setSettings(s => ({ ...s, showProjectName: !s.showProjectName }))}
                      className={cn("w-14 h-8 rounded-full transition-all relative", settings.showProjectName ? "bg-[#f51492]" : "bg-white/10")}
                    >
                      <div className={cn("absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-all", settings.showProjectName ? "left-7" : "left-1")} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Câmera</label>
                <div className="liquid-glass rounded-3xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Exibir Grade</span>
                    <button 
                      onClick={() => setSettings(s => ({ ...s, showGuides: !s.showGuides }))}
                      className={cn("w-14 h-8 rounded-full transition-all relative", settings.showGuides ? "bg-[#f51492]" : "bg-white/10")}
                    >
                      <div className={cn("absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-all", settings.showGuides ? "left-7" : "left-1")} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Espelhar Frontal</span>
                    <button 
                      onClick={() => setSettings(s => ({ ...s, mirrorFront: !s.mirrorFront }))}
                      className={cn("w-14 h-8 rounded-full transition-all relative", settings.mirrorFront ? "bg-[#f51492]" : "bg-white/10")}
                    >
                      <div className={cn("absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-all", settings.mirrorFront ? "left-7" : "left-1")} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Aplicativo</label>
                <div className="liquid-glass rounded-3xl p-6">
                  <button 
                    onClick={handleInstallClick}
                    disabled={isInstalled || (!deferredPrompt && !isIOS)}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                      isInstalled 
                        ? "bg-green-500/20 text-green-500 border border-green-500/30 cursor-default" 
                        : "bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                    )}
                  >
                    {isInstalled ? (
                      <>
                        <Zap size={18} />
                        App já instalado
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Instalar como APP
                      </>
                    )}
                  </button>
                  {!isInstalled && !deferredPrompt && !isIOS && (
                    <p className="text-[10px] text-white/40 mt-3 text-center px-4">
                      Seu navegador não suporta instalação direta. Tente usar o Chrome ou Safari.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowSettings(false)}
              className="mt-8 w-full py-4 bg-[#f51492] rounded-2xl font-bold shadow-lg shadow-[#f51492]/20"
            >
              Salvar Alterações
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Script Overlay */}
      <AnimatePresence>
        {showScript && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="absolute inset-y-0 right-0 w-80 z-[100] bg-black/40 backdrop-blur-3xl p-6 border-l border-white/5"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                <FileText size={20} className="text-[#f51492]" />
                Roteiro
              </h2>
              <button onClick={() => setShowScript(false)} className="p-2 liquid-glass rounded-full hover:bg-white/10 transition-all">
                <ChevronRight />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="liquid-glass p-5 rounded-3xl border-l-4 border-[#f51492]/50 shadow-xl">
                <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-2">Cena 1: Introdução</h3>
                <p className="text-sm font-medium leading-relaxed opacity-80">Falar sobre a dor dos creators em ter que gravar o mesmo vídeo várias vezes.</p>
              </div>
              <div className="liquid-glass p-5 rounded-3xl border-l-4 border-[#f51492]/50 shadow-xl">
                <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-2">Cena 2: Demonstração</h3>
                <p className="text-sm font-medium leading-relaxed opacity-80">Mostrar a função de gravação dupla em tempo real.</p>
              </div>
              <div className="liquid-glass p-5 rounded-3xl border-l-4 border-green-500/50 shadow-xl">
                <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-2">Cena 3: Call to Action</h3>
                <p className="text-sm font-medium leading-relaxed opacity-80">Pedir para baixar o InfluCam e testar as novas funções.</p>
              </div>
            </div>

            <button className="mt-8 w-full py-4 border border-white/10 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
              + Adicionar Tópico
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Selector (Floating) */}
      <AnimatePresence>
        {settings.showProjectName && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[72px] inset-x-0 flex justify-center z-40 pointer-events-none"
          >
            <div className="liquid-glass px-3 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest border border-white/5 shadow-sm pointer-events-auto opacity-60 hover:opacity-100 transition-opacity">
              <FolderOpen size={10} className="text-[#f51492]" />
              {settings.projectName}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Install Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm liquid-glass rounded-[32px] p-8 overflow-hidden"
            >
              <button 
                onClick={() => setShowIOSModal(false)}
                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#f51492] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#f51492]/20">
                  <Download className="text-white" size={32} />
                </div>
                
                <h3 className="text-xl font-bold mb-2">Instalar InfluCam</h3>
                <p className="text-sm text-white/60 mb-8">
                  Adicione o InfluCam à sua tela de início para uma experiência completa de câmera.
                </p>

                {!isSafari ? (
                  <div className="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-6">
                    <div className="flex items-center gap-2 text-amber-500 mb-1">
                      <ExternalLink size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Atenção</span>
                    </div>
                    <p className="text-xs text-amber-500/80 leading-relaxed">
                      Detectamos que você não está no Safari. Para instalar, abra este link no navegador Safari do seu iPhone.
                    </p>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    <div className="flex items-start gap-4 text-left">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                      <div className="text-sm">
                        Toque no botão de <span className="font-bold text-white flex items-center gap-1 inline-flex">Compartilhar <Share size={14} className="text-blue-400" /></span> na barra inferior do Safari.
                      </div>
                    </div>
                    <div className="flex items-start gap-4 text-left">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                      <div className="text-sm">
                        Role para baixo e toque em <span className="font-bold text-white flex items-center gap-1 inline-flex">Adicionar à Tela de Início <PlusSquare size={14} /></span>.
                      </div>
                    </div>
                    <div className="flex items-start gap-4 text-left">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                      <div className="text-sm">
                        Toque em <span className="font-bold text-[#f51492]">Adicionar</span> no canto superior direito.
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setShowIOSModal(false)}
                  className="mt-8 w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold transition-all text-sm uppercase tracking-widest"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
