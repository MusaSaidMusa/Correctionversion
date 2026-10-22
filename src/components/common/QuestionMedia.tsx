import React, { useState, useRef } from 'react';
import { Volume2, Play, Pause, RotateCcw, ImageIcon, AlertCircle } from 'lucide-react';

export interface MathRendererProps {
  formula?: string;
  mathEquation?: string;
  equation?: string;
  inline?: boolean;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  formula,
  mathEquation,
  equation,
  inline = false,
  className = '',
}) => {
  const content = formula || mathEquation || equation;
  if (!content) return null;

  return (
    <span
      className={`font-mono font-medium ${
        inline
          ? 'px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 text-xs'
          : 'block my-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-indigo-800 dark:text-indigo-200 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm overflow-x-auto'
      } ${className}`}
    >
      {content}
    </span>
  );
};

export interface AudioPromptPlayerProps {
  audioUrl?: string;
  label?: string;
  title?: string;
  maxPlays?: number;
}

export const AudioPromptPlayer: React.FC<AudioPromptPlayerProps> = ({
  audioUrl,
  label,
  title,
  maxPlays = 3,
}) => {
  const displayLabel = title || label || 'Listening Comprehension Audio Prompt';
  const [isPlaying, setIsPlaying] = useState(false);
  const [playsCount, setPlaysCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (playsCount >= maxPlays && !isPlaying) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!isPlaying) {
        setPlaysCount((p) => p + 1);
      }
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="p-3 my-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-indigo-600 text-white">
          <Volume2 className="w-4 h-4" />
        </div>
        <div>
          <h5 className="text-xs font-semibold text-slate-900 dark:text-white">{displayLabel}</h5>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Plays remaining: {Math.max(0, maxPlays - playsCount)} / {maxPlays}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={togglePlay}
        disabled={playsCount >= maxPlays && !isPlaying}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
          isPlaying
            ? 'bg-amber-500 hover:bg-amber-600 text-white'
            : playsCount >= maxPlays
            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
        }`}
      >
        {isPlaying ? (
          <>
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" />
            <span>Play Prompt</span>
          </>
        )}
      </button>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleEnded}
          onError={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
};

export interface TechnicalDiagramProps {
  diagramUrl?: string;
  imageUrl?: string;
  caption?: string;
  imageCaption?: string;
  transform?: any;
  imageTransform?: any;
  type?: string;
  altText?: string;
  inExamPaper?: boolean;
}

export const TechnicalDiagram: React.FC<TechnicalDiagramProps> = ({
  diagramUrl,
  imageUrl,
  caption,
  imageCaption,
  transform,
  imageTransform,
  type = 'System Architecture Schema',
  altText = 'Technical examination schematic',
  inExamPaper,
}) => {
  const effectiveUrl = diagramUrl || imageUrl;
  const effectiveCaption = caption || imageCaption;

  return (
    <div className="my-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
        <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
        <span>{type}</span>
      </div>

      <div className="p-4 flex items-center justify-center bg-slate-50/50 dark:bg-slate-950/50 min-h-[140px]">
        {effectiveUrl ? (
          <img
            src={effectiveUrl}
            alt={altText}
            className="max-h-64 object-contain rounded-lg shadow-xs"
          />
        ) : (
          <div className="w-full max-w-md p-4 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-800 text-center text-xs text-indigo-700 dark:text-indigo-400 font-mono">
            [ FIGURE: Distributed Cluster Architecture - Node A ↔ Consensus Ring ↔ Node B ]
          </div>
        )}
      </div>

      {effectiveCaption && (
        <div className="p-2.5 text-[11px] text-slate-500 dark:text-slate-400 text-center border-t border-slate-100 dark:border-slate-800 italic">
          {effectiveCaption}
        </div>
      )}
    </div>
  );
};

export interface DiagramAttachmentFieldProps {
  imageUrl?: string;
  imageCaption?: string;
  imageTransform?: any;
  onChange: (url: string, caption: string, transform: any) => void;
  disabled?: boolean;
  label?: string;
}

export const DiagramAttachmentField: React.FC<DiagramAttachmentFieldProps> = ({
  imageUrl = '',
  imageCaption = '',
  imageTransform,
  onChange,
  disabled = false,
  label = 'Diagram or Schematic Illustration (Optional)',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result, imageCaption || file.name, imageTransform);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
      <div className="flex items-center justify-between">
        <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
          <span>Diagram or Schematic Illustration (Optional)</span>
        </label>
        {imageUrl && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('', '', undefined)}
            className="text-[11px] text-rose-600 hover:text-rose-700 cursor-pointer font-medium"
          >
            Remove Image
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          disabled={disabled}
          placeholder="Paste Image URL or Diagram Web Link..."
          value={imageUrl.startsWith('data:') ? 'Uploaded image attachment' : imageUrl}
          onChange={(e) => onChange(e.target.value, imageCaption, imageTransform)}
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-indigo-500"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>Upload Image File</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      <input
        type="text"
        disabled={disabled}
        placeholder="Image caption / Figure description (e.g. Figure 1: Distributed Ring Topology)..."
        value={imageCaption}
        onChange={(e) => onChange(imageUrl, e.target.value, imageTransform)}
        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-indigo-500"
      />

      {imageUrl && (
        <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center max-h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={imageCaption || 'Diagram Preview'}
            className="max-h-36 object-contain rounded"
          />
          {imageCaption && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic text-center">
              {imageCaption}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

