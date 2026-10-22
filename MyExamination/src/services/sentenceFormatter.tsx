import React from 'react';

/**
 * Splits exam questions or prompts into clean sentence arrays or bullet points
 */
export function splitExamSentences(text: string): string[] {
  if (!text) return [];
  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rawLines.length > 1) {
    return rawLines;
  }
  const parts = text
    .split(/(?<=[.?!])\s+(?=[A-Z0-9(])|(?<=\))\s+(?=[A-Z0-9(])/g)
    .map((s) => s.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : [text];
}

export interface ExamSentencesRendererProps {
  prompt?: string;
  text?: string;
  className?: string;
  sentenceClassName?: string;
}

export const ExamSentencesRenderer: React.FC<ExamSentencesRendererProps> = ({
  prompt,
  text,
  className = '',
  sentenceClassName = '',
}) => {
  const content = prompt || text || '';
  if (!content) return null;
  const sentences = splitExamSentences(content);

  if (sentences.length <= 1) {
    return <span className={`whitespace-pre-line ${className} ${sentenceClassName}`}>{content}</span>;
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {sentences.map((line, idx) => {
        const isPoint = /^([0-9]+[.)]|\([a-z0-9]+\)|[a-z][.)]|•|\*|-)/i.test(line);
        return (
          <div
            key={idx}
            className={`leading-relaxed ${sentenceClassName} ${
              isPoint ? 'pl-4 font-normal' : ''
            }`}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};
