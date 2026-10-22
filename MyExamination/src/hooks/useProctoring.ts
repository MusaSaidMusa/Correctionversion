import { useState, useEffect, useRef, useCallback } from 'react';
import { ProctorIncident } from '../types';
import { acquireProctorMediaStream } from '../services/cameraService';

interface UseProctoringOptions {
  examId: string;
  studentId: string;
  studentName: string;
  enabled: boolean;
  strictSEB: boolean;
  requireCamera: boolean;
  requireMicrophone: boolean;
  isSubmitted: boolean;
  onIncident: (incident: ProctorIncident) => void;
  onDisconnectionLockout: (reason: string) => void;
}

export function useProctoring({
  examId,
  studentId,
  studentName,
  enabled,
  strictSEB,
  requireCamera,
  requireMicrophone,
  isSubmitted,
  onIncident,
  onDisconnectionLockout,
}: UseProctoringOptions) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 - 100
  const [isFaceDetected, setIsFaceDetected] = useState(true);
  const [multipleFacesDetected, setMultipleFacesDetected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [activeWarning, setActiveWarning] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isAcquiringRef = useRef<boolean>(false);

  // Keep stable refs to parent callbacks so hook effects don't churn on every render
  const onIncidentRef = useRef(onIncident);
  onIncidentRef.current = onIncident;

  const onDisconnectionLockoutRef = useRef(onDisconnectionLockout);
  onDisconnectionLockoutRef.current = onDisconnectionLockout;

  // Trigger incident helper (stable reference)
  const triggerIncident = useCallback(
    (
      type: ProctorIncident['type'],
      severity: ProctorIncident['severity'],
      description: string
    ) => {
      let snapshotUrl: string | undefined = undefined;
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 120;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, 160, 120);
            snapshotUrl = canvas.toDataURL('image/jpeg', 0.6);
          }
        } catch {
          // ignore
        }
      }

      const incident: ProctorIncident = {
        id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        studentId,
        studentName,
        examId,
        timestamp: new Date().toISOString(),
        type,
        severity,
        description,
        snapshotUrl,
        reviewed: false,
      };

      onIncidentRef.current(incident);
      setActiveWarning(description);

      setTimeout(() => {
        setActiveWarning((prev) => (prev === description ? null : prev));
      }, 5000);
    },
    [examId, studentId, studentName]
  );

  // Initialize Media Streams (Webcam & Mic) Once Automatically
  useEffect(() => {
    if (!enabled || isSubmitted) {
      // Camera and microphone only go off when student has submitted
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      return;
    }

    // If media stream is already established and active, keep it stable — DO NOT reacquire!
    if (localStreamRef.current && localStreamRef.current.active) {
      return;
    }

    if (isAcquiringRef.current) return;
    isAcquiringRef.current = true;

    async function initMedia() {
      try {
        const result = await acquireProctorMediaStream(studentName, studentId);
        const userStream = result.stream;
        localStreamRef.current = userStream;
        setStream(userStream);
        setCameraActive(userStream.getVideoTracks().length > 0);
        setMicActive(userStream.getAudioTracks().length > 0);

        if (videoRef.current && videoRef.current.srcObject !== userStream) {
          videoRef.current.srcObject = userStream;
          videoRef.current.play().catch(() => {});
        }

        // Attach track ended listeners (If student physically unplugs or revokes permissions)
        userStream.getTracks().forEach((track) => {
          track.onended = () => {
            if (!isSubmitted && !result.isSimulated) {
              triggerIncident(
                'device_turned_off',
                'high',
                `Security Violation: Hardware ${track.kind} stream was severed by candidate.`
              );
              onDisconnectionLockoutRef.current(
                `Institutional Security Protocol Breach: Your ${track.kind} feed was turned off during the exam. You have been locked out of this session.`
              );
            }
          };
        });

        // Web Audio analyser for ambient noise monitoring
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(userStream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            let highAudioDuration = 0;

            const checkAudio = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);

              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              const level = Math.min(100, Math.round((average / 128) * 100));
              setAudioLevel(level);

              if (level > 65) {
                highAudioDuration++;
                if (highAudioDuration === 12) {
                  triggerIncident(
                    'audio_anomaly',
                    'medium',
                    'Acoustic anomaly detected: Sustained conversational noise or background whispers.'
                  );
                }
              } else {
                highAudioDuration = Math.max(0, highAudioDuration - 1);
              }

              animFrameRef.current = requestAnimationFrame(checkAudio);
            };

            checkAudio();
          }
        } catch (e) {
          console.warn('Audio analyser unavailable', e);
        }
      } catch (err: any) {
        console.warn('Media initialization:', err);
        setCameraActive(true);
        setMicActive(true);
      } finally {
        isAcquiringRef.current = false;
      }
    }

    initMedia();

    // Check device alive status periodically
    const deviceHeartbeat = setInterval(() => {
      if (isSubmitted) return;
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const audioTrack = localStreamRef.current.getAudioTracks()[0];

        if (requireCamera && videoTrack && (!videoTrack.enabled || videoTrack.readyState === 'ended')) {
          onDisconnectionLockoutRef.current('Hardware Camera was turned off or disabled during active examination.');
        }
        if (requireMicrophone && audioTrack && (!audioTrack.enabled || audioTrack.readyState === 'ended')) {
          onDisconnectionLockoutRef.current('Microphone stream was muted or severed during active examination.');
        }
      }
    }, 4000);

    return () => {
      clearInterval(deviceHeartbeat);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (localStreamRef.current && isSubmitted) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [enabled, isSubmitted, requireCamera, requireMicrophone, studentName, studentId, triggerIncident]);

  // Continuously ensure videoRef is wired to active stream whenever either changes or mounts
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  // Tab Switching & Window Visibility Monitoring
  useEffect(() => {
    if (!enabled || isSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((c) => c + 1);
        triggerIncident(
          'tab_switch',
          'high',
          'Security Breach: Candidate switched active browser tab or minimized window.'
        );
      }
    };

    const handleWindowBlur = () => {
      triggerIncident(
        'tab_switch',
        'medium',
        'Window Focus Lost: Exam window is no longer the active foreground application.'
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, isSubmitted, triggerIncident]);

  // Fullscreen & SEB Browser Lock Protections
  useEffect(() => {
    if (!enabled || isSubmitted) return;

    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) {
        triggerIncident(
          'fullscreen_exit',
          'high',
          'Fullscreen Exited: Testing environment integrity compromised. Re-enter fullscreen.'
        );
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCopyPaste = (e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'p'].includes(e.key.toLowerCase());
      const isDevTools = e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()));
      const isAltTab = e.altKey && e.key === 'Tab';

      if (isCopyPaste || isDevTools || isAltTab) {
        e.preventDefault();
        triggerIncident(
          'copy_paste_attempt',
          'medium',
          `Restricted keystroke intercepted (${e.key.toUpperCase()}). Clipboard & dev actions disabled.`
        );
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerIncident(
        'copy_paste_attempt',
        'low',
        'Context menu disabled during secure examination session.'
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enabled, isSubmitted, triggerIncident]);

  const switchCameraDevice = async (deviceId: string) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const result = await acquireProctorMediaStream(studentName, studentId, deviceId);
      const userStream = result.stream;
      localStreamRef.current = userStream;
      setStream(userStream);
      setCameraActive(userStream.getVideoTracks().length > 0);
      setMicActive(userStream.getAudioTracks().length > 0);
      if (videoRef.current) {
        videoRef.current.srcObject = userStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Switch camera error:', e);
    }
  };

  const [isCameraTurnedOff, setIsCameraTurnedOff] = useState(false);

  const turnCameraOff = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
    }
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
    }
    setCameraActive(false);
    setIsCameraTurnedOff(true);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const requestFullscreenMode = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Fullscreen request failed', err);
    }
  };

  return {
    videoRef,
    stream,
    cameraActive,
    micActive,
    audioLevel,
    isFaceDetected,
    multipleFacesDetected,
    isFullscreen,
    tabSwitchCount,
    activeWarning,
    dismissWarning: () => setActiveWarning(null),
    requestFullscreenMode,
    switchCameraDevice,
    turnCameraOff,
    isCameraTurnedOff,
  };
}
