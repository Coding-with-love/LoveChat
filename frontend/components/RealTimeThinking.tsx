import { memo, useState, useEffect } from 'react';
import { Brain, ChevronUpIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

interface RealtimeThinkingProps {
  isVisible: boolean;
  thinkingContent: string;
  messageId: string;
}

function PureRealtimeThinking({ isVisible, thinkingContent, messageId }: RealtimeThinkingProps) {
  const [dots, setDots] = useState("...");
  const [isExpanded, setIsExpanded] = useState(true);

  // Animate the dots
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return ".";
        if (prev === ".") return "..";
        if (prev === "..") return "...";
        return ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="mb-4">
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 mb-2 rounded-full",
          "bg-purple-100 dark:bg-purple-900/30",
          "text-purple-800 dark:text-purple-300",
          "border border-purple-200 dark:border-purple-800",
          "shadow-sm transition-all duration-300",
        )}
      >
        <Brain className="h-4 w-4" />
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="text-sm font-medium flex items-center gap-1"
        >
          Thinking{dots}
          {isExpanded ? (
            <ChevronUpIcon className="h-3 w-3 ml-1" />
          ) : (
            <ChevronDownIcon className="h-3 w-3 ml-1" />
          )}
        </button>
      </div>
      
      {isExpanded && thinkingContent && (
        <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-3 bg-purple-50/50 dark:bg-purple-900/20">
          <div className="text-xs text-purple-700 dark:text-purple-400 mb-2 font-medium">
            Real-time reasoning process:
          </div>
          <div className="text-sm whitespace-pre-wrap font-mono text-gray-800 dark:text-gray-200">
            {thinkingContent}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(PureRealtimeThinking);
