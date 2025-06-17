import { memo, useState, useEffect } from 'react';
import { Brain, ChevronUpIcon, ChevronDownIcon } from 'lucide-react';
import MemoizedMarkdown from './MemoizedMarkdown';

interface StreamingReasoningProps {
  reasoning: string;
  isStreaming: boolean;
  duration?: number;
  messageId: string;
}

function PureStreamingReasoning({
  reasoning,
  isStreaming,
  duration,
  messageId,
}: StreamingReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Always start expanded for streaming
  const [displayText, setDisplayText] = useState('');

  // Update display text as reasoning streams in
  useEffect(() => {
    if (isStreaming) {
      setDisplayText(reasoning);
    } else {
      // When streaming ends, show final reasoning
      setDisplayText(reasoning);
    }
  }, [reasoning, isStreaming]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="flex flex-col gap-2 pb-2 max-w-3xl w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
      >
        <Brain className="w-4 h-4" />
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4" />
        ) : (
          <ChevronDownIcon className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {isStreaming ? "Thinking..." : "Reasoning"}
        </span>
        {isStreaming && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs text-blue-600 dark:text-blue-400">streaming</span>
          </div>
        )}
        {!isStreaming && duration && (
          <span className="text-xs text-muted-foreground">
            thought for {formatDuration(duration)}
          </span>
        )}
      </button>
      {isExpanded && (
        <div className="p-4 rounded-md bg-accent/20 border border-border">
          {isStreaming && displayText.length === 0 ? (
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
              <MemoizedMarkdown content={displayText} id={messageId} size="small" />
              {isStreaming && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                  <span>streaming...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(PureStreamingReasoning, (prev, next) => {
  return prev.reasoning === next.reasoning && 
         prev.isStreaming === next.isStreaming && 
         prev.duration === next.duration &&
         prev.messageId === next.messageId;
}); 