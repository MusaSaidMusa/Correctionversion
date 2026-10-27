import React from 'react';

interface ExamSentencesRendererProps {
  text: string;
  className?: string;
  sentenceClassName?: string;
}

export function splitTextIntoSentences(text: string): string[] {
  if (!text) return [];
  // Split on punctuation followed by space or newline, while preserving contents
  const cleaned = text.trim();
  const sentences = cleaned
    .split(/(?<=[.?!])\s+(?=[A-Z0-9])|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences.length > 0 ? sentences : [cleaned];
}

export const ExamSentencesRenderer: React.FC<ExamSentencesRendererProps> = ({
  text,
  className = 'space-y-2',
  sentenceClassName = 'block leading-relaxed',
}) => {
  const sentences = splitTextIntoSentences(text);

  return (
    <div className={className}>
      {sentences.map((sentence, idx) => (
        <span key={idx} className={sentenceClassName}>
          {sentence}
        </span>
      ))}
    </div>
  );
};
