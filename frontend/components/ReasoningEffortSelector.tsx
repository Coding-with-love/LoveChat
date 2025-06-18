"use client"

import { useState } from "react"
import { Brain, Zap, Target, Sparkles } from "lucide-react"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { cn } from "@/lib/utils"

interface ReasoningEffortSelectorProps {
  value: "low" | "medium" | "high"
  onChange: (effort: "low" | "medium" | "high") => void
  disabled?: boolean
}

const effortOptions = [
  {
    value: "low" as const,
    label: "Low",
    icon: Zap,
    description: "Faster responses with basic reasoning",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800",
  },
  {
    value: "medium" as const,
    label: "Medium",
    icon: Target,
    description: "Balanced reasoning depth and speed",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    value: "high" as const,
    label: "High",
    icon: Sparkles,
    description: "Deep reasoning for complex problems",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
]

export function ReasoningEffortSelector({ value, onChange, disabled }: ReasoningEffortSelectorProps) {
  const [open, setOpen] = useState(false)
  
  const selectedOption = effortOptions.find(option => option.value === value) || effortOptions[1]
  const SelectedIcon = selectedOption.icon

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 h-8 px-3",
            "hover:bg-accent/50 transition-colors",
            selectedOption.color
          )}
        >
          <Brain className="h-3.5 w-3.5" />
          <SelectedIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{selectedOption.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Reasoning Effort</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Control how deeply the AI reasons about your request. Higher effort may take longer but provides more thorough analysis.
          </p>
          <div className="space-y-2">
            {effortOptions.map((option) => {
              const Icon = option.icon
              const isSelected = option.value === value
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg border transition-all",
                    "hover:bg-accent/50",
                    isSelected
                      ? cn(option.bgColor, option.borderColor, "ring-1 ring-current")
                      : "border-border bg-background"
                  )}
                >
                  <Icon className={cn("h-4 w-4 mt-0.5", isSelected ? option.color : "text-muted-foreground")} />
                  <div className="flex-1 text-left">
                    <div className={cn("text-sm font-medium", isSelected ? option.color : "text-foreground")}>
                      {option.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 