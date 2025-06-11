import React from 'react';
import katex from 'katex';

interface InlineMathProps {
  math: string;
}

export function InlineMath({ math }: InlineMathProps) {
  const html = React.useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: false,
        throwOnError: false,
        strict: false,
        output: 'html',
        trust: true,
      });
    } catch (error) {
      console.error('KaTeX error:', error);
      return math;
    }
  }, [math]);

  return (
    <span 
      className="inline-math"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
} 