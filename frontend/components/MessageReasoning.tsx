import { memo, useState, useEffect, useMemo } from 'react';
import MemoizedMarkdown from './MemoizedMarkdown';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

function PureMessageReasoning({
  reasoning,
  id,
  isStreaming = false,
  autoExpand = false,
}: {
  reasoning: string;
  id: string;
  isStreaming?: boolean;
  autoExpand?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(autoExpand);

  // Auto-expand for streaming thinking models
  useEffect(() => {
    if (autoExpand || isStreaming) {
      setIsExpanded(true);
    }
  }, [autoExpand, isStreaming]);

  // Clean and format reasoning content for better display
  const cleanedReasoning = useMemo(() => {
    if (!reasoning) return "";
    
    return reasoning
      .replace(/^\s*[-•]\s*/gm, '') // Remove bullet points
      .replace(/(\n\s*){3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/^(.*?)\1+$/gm, '$1') // Remove simple repetitions
      .replace(/^(\d+\.\s*)+/gm, '') // Remove repeated numbering
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/\n{2,}/g, '\n\n') // Normalize line breaks
      .trim();
  }, [reasoning]);

  // Show a thinking indicator for streaming or placeholder content
  const isThinkingPlaceholder = reasoning === "Thinking..." || (isStreaming && cleanedReasoning.length < 10);

  // Don't render if no meaningful content
  if (!reasoning && !isStreaming) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 pb-2 max-w-3xl w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
      >
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4" />
        ) : (
          <ChevronDownIcon className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {isThinkingPlaceholder ? "Thinking..." : "Reasoning"}
        </span>
        {isStreaming && !isThinkingPlaceholder && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs text-blue-600 dark:text-blue-400">streaming</span>
          </div>
        )}
        {cleanedReasoning.length > 0 && !isStreaming && (
          <span className="text-xs text-muted-foreground">
            {cleanedReasoning.length} characters
          </span>
        )}
      </button>
      {isExpanded && (
        <div className="p-4 rounded-md bg-accent/20 border border-border">
          {isThinkingPlaceholder ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>AI is thinking...</span>
            </div>
          ) : (
            <div className="text-sm">
              <MemoizedMarkdown content={cleanedReasoning} id={id} size="small" />
              {isStreaming && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                  <span>reasoning in progress...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(PureMessageReasoning, (prev, next) => {
  return prev.reasoning === next.reasoning && 
         prev.id === next.id && 
         prev.isStreaming === next.isStreaming && 
         prev.autoExpand === next.autoExpand;
});
