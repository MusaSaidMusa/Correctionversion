export interface MediaStreamResult {
  stream: MediaStream;
  isSimulated?: boolean;
}

export async function acquireProctorMediaStream(
  studentName: string = 'Candidate',
  studentId: string = 'ADM-2026',
  deviceId?: string
): Promise<MediaStreamResult> {
  // 1. Try real hardware camera & microphone
  if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
      };
      if (deviceId) {
        videoConstraints.deviceId = { exact: deviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true,
      });
      return { stream, isSimulated: false };
    } catch (hardwareErr) {
      console.warn('[Proctoring Engine] Native hardware camera/mic unavailable, generating simulated secure proctor feed:', hardwareErr);
    }
  }

  // 2. Fallback: generate a simulated hardware proctor video & audio track
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');

  let animationFrame: number;
  const drawFrame = () => {
    if (!ctx) return;
    const now = new Date();
    
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 240);

    // Grid lines for security view
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 320; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 240);
      ctx.stroke();
    }
    for (let y = 0; y < 240; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(320, y);
      ctx.stroke();
    }

    // Avatar silhouette
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(160, 95, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(160, 185, 55, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Proctor overlay badge
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(20, 20, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('LIVE PROCTOR FEED', 32, 24);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(`CANDIDATE: ${studentName}`, 16, 215);
    ctx.fillText(`ID: ${studentId} · ${now.toLocaleTimeString()}`, 16, 230);

    animationFrame = requestAnimationFrame(drawFrame);
  };

  drawFrame();

  const simulatedStream = canvas.captureStream ? canvas.captureStream(15) : new MediaStream();

  // Synthesize an audio track using AudioContext
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001; // Silent carrier so analyzer detects audio track without noise
      osc.connect(gain);
      const dest = audioCtx.createMediaStreamDestination();
      gain.connect(dest);
      osc.start();
      dest.stream.getAudioTracks().forEach((track) => simulatedStream.addTrack(track));
    }
  } catch {
    // Audio synthesis not critical
  }

  return { stream: simulatedStream, isSimulated: true };
}
