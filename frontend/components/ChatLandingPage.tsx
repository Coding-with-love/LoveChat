"use client"

import { Button } from "./ui/button"
import { useEffect, useState } from "react"
import { 
  Sparkles, 
  FileText, 
  Code, 
  GraduationCap, 
  Zap, 
  Search, 
  Terminal, 
  BookOpen,
  Atom,
  Link,
  Database,
  Shield,
  Gauge,
  Building,
  AlertTriangle,
  TestTube,
  Rocket,
  Network,
  Ticket,
  Anchor,
  Library,
  Bug
} from "lucide-react"

interface ChatLandingPageProps {
  onPromptClick: (prompt: string) => void
  userName?: string
}

const categories = [
  {
    name: "Create",
    icon: Sparkles,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 hover:bg-purple-500/20",
    borderColor: "border-purple-500/20 hover:border-purple-500/40"
  },
  {
    name: "Explore",
    icon: Search,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
    borderColor: "border-blue-500/20 hover:border-blue-500/40"
  },
  {
    name: "Code",
    icon: Terminal,
    color: "text-green-500",
    bgColor: "bg-green-500/10 hover:bg-green-500/20",
    borderColor: "border-green-500/20 hover:border-green-500/40"
  },
  {
    name: "Learn",
    icon: BookOpen,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10 hover:bg-orange-500/20",
    borderColor: "border-orange-500/20 hover:border-orange-500/40"
  },
]

const categoryPrompts = {
  Create: [
    {
      title: "Write a professional email",
      description: "Draft a compelling business proposal or follow-up",
      icon: FileText,
      color: "text-blue-500"
    },
    {
      title: "Create a presentation outline",
      description: "Structure a persuasive pitch or educational talk",
      icon: Sparkles,
      color: "text-purple-500"
    },
    {
      title: "Design a workout plan",
      description: "Custom fitness routine based on your goals",
      icon: Gauge,
      color: "text-green-500"
    },
    {
      title: "Plan a travel itinerary",
      description: "Detailed trip schedule with recommendations",
      icon: Network,
      color: "text-orange-500"
    },
  ],
  Explore: [
    {
      title: "Research a complex topic",
      description: "Deep dive into any subject with multiple perspectives",
      icon: Search,
      color: "text-blue-500"
    },
    {
      title: "Analyze market trends",
      description: "Examine industry patterns and future predictions",
      icon: Gauge,
      color: "text-yellow-500"
    },
    {
      title: "Compare different options",
      description: "Pros and cons analysis for decision making",
      icon: Building,
      color: "text-purple-500"
    },
    {
      title: "Investigate historical events",
      description: "Explore causes, effects, and significance",
      icon: Library,
      color: "text-green-500"
    },
  ],
  Code: [
    {
      title: "Debug code issues",
      description: "Fix errors and optimize performance",
      icon: Bug,
      color: "text-red-500"
    },
    {
      title: "Write a script or function",
      description: "Custom automation or utility code",
      icon: Terminal,
      color: "text-green-500"
    },
    {
      title: "Review code architecture",
      description: "Best practices and improvement suggestions",
      icon: Building,
      color: "text-blue-500"
    },
    {
      title: "Learn a new framework",
      description: "Step-by-step tutorial with examples",
      icon: Rocket,
      color: "text-purple-500"
    },
  ],
  Learn: [
    {
      title: "Explain a difficult concept",
      description: "Break down complex ideas into simple terms",
      icon: BookOpen,
      color: "text-blue-500"
    },
    {
      title: "Practice a new language",
      description: "Conversational practice and grammar help",
      icon: Network,
      color: "text-green-500"
    },
    {
      title: "Understand scientific principles",
      description: "Physics, chemistry, biology, or mathematics",
      icon: TestTube,
      color: "text-purple-500"
    },
    {
      title: "Study for an exam",
      description: "Create study guides and practice questions",
      icon: GraduationCap,
      color: "text-orange-500"
    },
  ],
}

export default function ChatLandingPage({ onPromptClick, userName }: ChatLandingPageProps) {
  const [selectedCategory, setSelectedCategory] = useState("Create")
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <>
      {/* Desktop/Tablet Layout */}
      <div className="hidden sm:block relative flex flex-col items-center justify-start w-full max-w-3xl mx-auto px-4 py-6">
        <div className={`space-y-6 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Welcome Message & Title */}
          <div className="text-center space-y-2">
            {userName && (
              <p className="text-muted-foreground text-sm">
                Welcome back, <span className="text-primary font-medium">{userName}</span>!
              </p>
            )}
            
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              How can I help you?
            </h1>
          </div>

          {/* Simple Category Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? "default" : "outline"}
                size="sm"
                className={`gap-2 transition-all duration-200 ${
                  selectedCategory === category.name 
                    ? "" 
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedCategory(category.name)}
              >
                <category.icon className="h-4 w-4" />
                {category.name}
              </Button>
            ))}
          </div>

          {/* Simple Example Questions List */}
          <div className="w-full max-w-2xl mx-auto space-y-3">
            {categoryPrompts[selectedCategory as keyof typeof categoryPrompts].slice(0, 4).map((prompt, index) => (
              <button
                key={index}
                className="w-full text-left p-3 rounded-lg hover:bg-muted/30 transition-all duration-200 group border border-transparent hover:border-border/50"
                onClick={() => onPromptClick(`${prompt.title}: ${prompt.description}`)}
              >
                <div className="flex items-center gap-3">
                  <prompt.icon className={`h-4 w-4 ${prompt.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                  <span className="text-foreground group-hover:text-primary transition-colors">
                    {prompt.title}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Subtle Call to Action */}
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Or ask me anything...
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Layout - Ultra Compact */}
      <div className="sm:hidden relative flex flex-col items-center justify-start w-full mx-auto px-3 py-2 h-full overflow-hidden">
        <div className={`space-y-2 transition-all duration-1000 ease-out w-full ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Welcome Message */}
          {userName && (
            <div className="text-center">
              <p className="text-muted-foreground text-xs">
                Welcome back, <span className="text-primary font-medium">{userName}</span>!
              </p>
            </div>
          )}

          {/* Compact Greeting */}
          <div className="text-center space-y-1">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-md border border-primary/20">
                  <Zap className="w-3 h-3 text-primary-foreground" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-background">
                  <div className="w-0.5 h-0.5 bg-white rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            
            <h1 className="text-base font-bold text-foreground leading-tight">
              How can I help you today?
            </h1>
          </div>

          {/* Compact Actions */}
          <div className="w-full">
            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-2 shadow-sm">
              <div className="grid grid-cols-4 gap-1">
                {categories.map((category) => (
                  <Button
                    key={category.name}
                    variant="ghost"
                    className={`h-auto p-1.5 flex-col space-y-0.5 transition-all duration-200 border rounded-lg text-xs ${
                      selectedCategory === category.name 
                        ? `${category.bgColor} ${category.borderColor}` 
                        : "border-transparent hover:border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <category.icon className={`h-3 w-3 ${selectedCategory === category.name ? category.color : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-medium leading-none ${selectedCategory === category.name ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {category.name}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Compact Suggestions */}
          <div className="w-full">
            <h3 className="text-xs font-semibold mb-1 text-center">
              Popular <span className="text-primary">{selectedCategory}</span> requests
            </h3>
            
            <div className="space-y-1">
              {categoryPrompts[selectedCategory as keyof typeof categoryPrompts].slice(0, 3).map((prompt, index) => (
                <div
                  key={index}
                  className="group bg-card/40 hover:bg-card/60 border border-border/30 hover:border-border rounded-lg p-2 cursor-pointer transition-all duration-200"
                  onClick={() => onPromptClick(`${prompt.title}: ${prompt.description}`)}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`flex-shrink-0 p-1 rounded-md bg-muted/30 group-hover:bg-muted/50 transition-colors`}>
                      <prompt.icon className={`h-2.5 w-2.5 ${prompt.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-xs text-foreground group-hover:text-primary transition-colors truncate">
                        {prompt.title}
                      </h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compact Call to Action */}
          <div className="text-center pt-1">
            <p className="text-muted-foreground text-xs flex items-center justify-center gap-1">
              Or type below 
              <Terminal className="h-2 w-2" />
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

