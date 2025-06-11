"use client"

import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { MessageSquare, Code, FileText, Lightbulb, Search, Zap, Brain, Palette, Sparkles } from "lucide-react"

interface ChatLandingPageProps {
  onPromptClick: (prompt: string) => void
}

const examplePrompts = [
  {
    category: "Code & Development",
    icon: Code,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    prompts: [
      "Help me debug this JavaScript function",
      "Explain how React hooks work",
      "Write a Python script to sort a list",
      "Review my code for best practices",
    ],
  },
  {
    category: "Writing & Content",
    icon: FileText,
    color: "bg-green-500/10 text-green-700 dark:text-green-300",
    prompts: [
      "Write a professional email",
      "Help me brainstorm blog post ideas",
      "Proofread and improve this text",
      "Create an outline for my presentation",
    ],
  },
  {
    category: "Learning & Explanation",
    icon: Brain,
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
    prompts: [
      "Explain quantum computing in simple terms",
      "What are the key principles of UX design?",
      "Help me understand machine learning basics",
      "Teach me about sustainable energy",
    ],
  },
  {
    category: "Creative & Design",
    icon: Palette,
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
    prompts: [
      "Generate creative writing prompts",
      "Help me design a color palette",
      "Brainstorm logo concepts",
      "Create a marketing campaign idea",
    ],
  },
]

const capabilities = [
  {
    icon: MessageSquare,
    title: "Natural Conversations",
    description: "Have natural, contextual conversations about any topic",
  },
  {
    icon: Code,
    title: "Code Assistance",
    description: "Get help with programming, debugging, and code reviews",
  },
  {
    icon: FileText,
    title: "Writing Support",
    description: "Improve your writing, create content, and edit documents",
  },
  {
    icon: Search,
    title: "Research Help",
    description: "Find information, analyze data, and explore complex topics",
  },
  {
    icon: Lightbulb,
    title: "Problem Solving",
    description: "Work through challenges and find creative solutions",
  },
  {
    icon: Zap,
    title: "Quick Answers",
    description: "Get fast, accurate answers to your questions",
  },
]

export default function ChatLandingPage({ onPromptClick }: ChatLandingPageProps) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
            Welcome to Your AI Assistant
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Start a conversation, ask questions, get help with coding, writing, research, and more. Your AI-powered
            companion is ready to assist you.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>Powered by advanced AI models</span>
        </div>
      </div>

      {/* Capabilities Grid */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-center">What I Can Help You With</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map((capability, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <capability.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">{capability.title}</h3>
                <p className="text-sm text-muted-foreground">{capability.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Example Prompts */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">Get Started with These Examples</h2>
          <p className="text-muted-foreground">Click on any prompt below to start a conversation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {examplePrompts.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <category.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg">{category.category}</h3>
                </div>

                <div className="space-y-2">
                  {category.prompts.map((prompt, promptIndex) => (
                    <Button
                      key={promptIndex}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto p-3 hover:bg-muted/50"
                      onClick={() => onPromptClick(prompt)}
                    >
                      <span className="text-sm">{prompt}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Pro Tips for Better Results</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-0.5">
                  1
                </Badge>
                <span>Be specific and clear about what you need</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-0.5">
                  2
                </Badge>
                <span>Provide context for better understanding</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-0.5">
                  3
                </Badge>
                <span>Ask follow-up questions to dive deeper</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-0.5">
                  4
                </Badge>
                <span>Use examples to clarify your requirements</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">
          Ready to start? Type your message in the chat box below or click on any example above.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          <span>Your conversation will begin here</span>
        </div>
      </div>
    </div>
  )
}
