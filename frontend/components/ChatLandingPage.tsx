"use client"

import { Button } from "./ui/button"
import { useEffect, useState } from "react"
import { Sparkles, FileText, Code, GraduationCap } from "lucide-react"

interface ChatLandingPageProps {
  onPromptClick: (prompt: string) => void
  userName?: string
}

const categories = [
  {
    name: "Create",
    icon: Sparkles,
  },
  {
    name: "Explore",
    icon: FileText,
  },
  {
    name: "Code",
    icon: Code,
  },
  {
    name: "Learn",
    icon: GraduationCap,
  },
]

const categoryPrompts = {
  Create: [
    "Write a React component for a todo list",
    "Create a REST API endpoint in Node.js",
    "Generate a database schema for a blog",
    "Design a user authentication system",
  ],
  Explore: [
    "Analyze my code for performance issues",
    "Review my API architecture",
    "Find security vulnerabilities in my app",
    "Suggest improvements for my database queries",
  ],
  Code: [
    "Debug this TypeScript error",
    "Help me with Jest unit tests",
    "Fix this React useEffect warning",
    "Optimize this slow SQL query",
  ],
  Learn: [
    "Explain microservices architecture",
    "How does JWT authentication work?",
    "What are React hooks best practices?",
    "Teach me about database indexing",
  ],
}

export default function ChatLandingPage({ onPromptClick, userName }: ChatLandingPageProps) {
  const [selectedCategory, setSelectedCategory] = useState("Create")

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4 py-8 space-y-8 min-h-[60vh]">
      {/* Greeting */}
      <h1 className="text-3xl md:text-4xl font-bold text-center text-foreground">
        How can I help you{userName ? `, ${userName}` : ""}?
      </h1>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((category) => (
          <Button
            key={category.name}
            variant="outline"
            className={`rounded-full px-6 py-3 h-auto hover:bg-muted border-border ${
              selectedCategory === category.name 
                ? "bg-muted dark:bg-muted/50 border-primary dark:border-primary" 
                : "bg-background"
            }`}
            onClick={() => setSelectedCategory(category.name)}
          >
            <category.icon className="mr-2 h-4 w-4" />
            {category.name}
          </Button>
        ))}
      </div>

      {/* Example prompts */}
      <div className="w-full max-w-lg space-y-2">
        {categoryPrompts[selectedCategory as keyof typeof categoryPrompts].map((prompt, index) => (
          <Button
            key={index}
            variant="ghost"
            className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground"
            onClick={() => onPromptClick(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  )
}
