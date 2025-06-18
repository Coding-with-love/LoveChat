"use client"

import { Brain } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface ThinkingIndicatorProps {
  isVisible: boolean
  variant?: "default" | "deepseek" | "openrouter"
  className?: string
}

export function ThinkingIndicator({ 
  isVisible, 
  variant = "default",
  className 
}: ThinkingIndicatorProps) {
  const [dots, setDots] = useState("...")
  const [phase, setPhase] = useState(0)

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
    }, 600);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Animate thinking phases for deepseek models
  useEffect(() => {
    if (!isVisible || variant !== "deepseek") return;

    const phaseInterval = setInterval(() => {
      setPhase((prev) => (prev + 1) % 4);
    }, 2000);

    return () => clearInterval(phaseInterval);
  }, [isVisible, variant]);

  if (!isVisible) return null;

  const getThinkingText = () => {
    if (variant === "deepseek") {
      const phases = [
        "Analyzing the problem",
        "Considering different approaches", 
        "Synthesizing information",
        "Finalizing response"
      ];
      return phases[phase];
    }
    if (variant === "openrouter") {
      return "Processing through OpenRouter";
    }
    return "Thinking";
  };

  const getIcon = () => {
    if (variant === "deepseek") {
      return "🧠";
    }
    if (variant === "openrouter") {
      return "🔄";
    }
    return <Brain className="h-4 w-4" />;
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-full",
      "bg-purple-100 dark:bg-purple-900/30",
      "text-purple-800 dark:text-purple-300", 
      "border border-purple-200 dark:border-purple-700",
      "shadow-sm transition-all duration-300",
      "animate-pulse",
      className
    )}>
      <span className="text-base">{getIcon()}</span>
      <span className="text-sm font-medium">
        {getThinkingText()}{dots}
      </span>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
