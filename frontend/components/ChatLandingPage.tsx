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
      <div className="hidden sm:block relative flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 py-8 min-h-[70vh]">
        {/* Background Accent */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-gradient-to-r from-primary/5 to-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/5 to-primary/5 rounded-full blur-3xl" />
        </div>

        <div className={`space-y-8 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Welcome Message */}
          {userName && (
            <div className="text-center animate-in fade-in duration-700">
              <p className="text-muted-foreground text-lg">
                Welcome back, <span className="text-primary font-medium">{userName}</span>!
              </p>
            </div>
          )}

          {/* AI Mascot & Greeting */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg border border-primary/20">
                  <Zap className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-background">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent leading-tight">
              How can I help you today?
            </h1>
            
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Choose a category below or describe what you'd like to work on. I'm here to assist with coding, learning, and creative projects.
            </p>
          </div>

          {/* Quick Actions Card */}
          <div className="w-full max-w-2xl mx-auto">
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold mb-4 text-center text-muted-foreground">Quick Actions</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {categories.map((category) => (
                  <Button
                    key={category.name}
                    variant="ghost"
                    className={`h-auto p-4 flex-col space-y-2 transition-all duration-200 border rounded-xl ${
                      selectedCategory === category.name 
                        ? `${category.bgColor} ${category.borderColor}` 
                        : "border-transparent hover:border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <category.icon className={`h-6 w-6 ${selectedCategory === category.name ? category.color : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${selectedCategory === category.name ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {category.name}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced Suggestions */}
          <div className="w-full max-w-3xl mx-auto">
            <h3 className="text-xl font-semibold mb-4 text-center">
              Popular <span className="text-primary">{selectedCategory}</span> requests
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryPrompts[selectedCategory as keyof typeof categoryPrompts].map((prompt, index) => (
                <div
                  key={index}
                  className="group bg-card/60 hover:bg-card/80 border border-border/50 hover:border-border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                  onClick={() => onPromptClick(`${prompt.title}: ${prompt.description}`)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 mt-1 p-2 rounded-lg bg-muted/50 group-hover:bg-muted/70 transition-colors`}>
                      <prompt.icon className={`h-5 w-5 ${prompt.color}`} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {prompt.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {prompt.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
              Or simply type your question in the chat below 
              <Terminal className="h-4 w-4" />
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

