import { memo, useState, useEffect } from 'react';
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

  // Show a thinking indicator for streaming or placeholder content
  const isThinkingPlaceholder = reasoning === "Thinking..." || (isStreaming && reasoning.length < 10);

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
              <MemoizedMarkdown content={reasoning} id={id} size="small" />
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
