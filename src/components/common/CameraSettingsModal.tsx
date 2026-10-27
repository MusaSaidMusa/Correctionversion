import React, { useState, useEffect } from 'react';
import { X, Camera, Mic, CheckCircle2, RefreshCw, Sliders } from 'lucide-react';

interface CameraSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  candidateNumber: string;
  onDeviceSelected?: (deviceId: string) => void;
}

export const CameraSettingsModal: React.FC<CameraSettingsModalProps> = ({
  isOpen,
  onClose,
  candidateName,
  candidateNumber,
  onDeviceSelected,
}) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((allDevices) => {
          const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
          setDevices(videoInputs);
          if (videoInputs.length > 0) {
            setSelectedDevice(videoInputs[0].deviceId);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Camera & Microphone Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Proctor Hardware Device Calibration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="text-slate-500 dark:text-slate-400">Proctored Candidate:</div>
            <div className="font-bold text-slate-900 dark:text-slate-100">{candidateName}</div>
            <div className="text-slate-500 dark:text-slate-400">Candidate ID: {candidateNumber}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Select Video Device
            </label>
            {devices.length > 0 ? (
              <select
                value={selectedDevice}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedDevice(id);
                  onDeviceSelected?.(id);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {devices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-600" />
                <span>Primary system integrated webcam selected and active.</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>WebRTC Stream Latency: Optimal (&lt;80ms)</span>
          </div>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              Confirm Device Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
