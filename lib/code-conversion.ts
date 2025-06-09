export interface ConversionTarget {
    language: string
    framework?: string
    label: string
  }
  
  export const CONVERSION_TARGETS: ConversionTarget[] = [
    // Core Languages
    { language: "javascript", label: "JavaScript" },
    { language: "typescript", label: "TypeScript" },
    { language: "python", label: "Python" },
    { language: "java", label: "Java" },
    { language: "go", label: "Go" },
    { language: "rust", label: "Rust" },
    { language: "csharp", label: "C#" },
    { language: "cpp", label: "C++" },
    { language: "c", label: "C" },
    { language: "php", label: "PHP" },
    { language: "ruby", label: "Ruby" },
    { language: "swift", label: "Swift" },
    { language: "kotlin", label: "Kotlin" },
    { language: "dart", label: "Dart" },
    { language: "scala", label: "Scala" },
    { language: "clojure", label: "Clojure" },
    { language: "elixir", label: "Elixir" },
    { language: "erlang", label: "Erlang" },
    { language: "haskell", label: "Haskell" },
    { language: "ocaml", label: "OCaml" },
    { language: "fsharp", label: "F#" },
    { language: "lua", label: "Lua" },
    { language: "perl", label: "Perl" },
    { language: "r", label: "R" },
    { language: "matlab", label: "MATLAB" },
    { language: "julia", label: "Julia" },
    { language: "nim", label: "Nim" },
    { language: "zig", label: "Zig" },
    { language: "crystal", label: "Crystal" },
  
    // JavaScript/TypeScript Frameworks & Libraries
    { language: "javascript", framework: "react", label: "React" },
    { language: "javascript", framework: "vue", label: "Vue.js" },
    { language: "javascript", framework: "svelte", label: "Svelte" },
    { language: "javascript", framework: "angular", label: "Angular" },
    { language: "javascript", framework: "nextjs", label: "Next.js" },
    { language: "javascript", framework: "nuxtjs", label: "Nuxt.js" },
    { language: "javascript", framework: "sveltekit", label: "SvelteKit" },
    { language: "javascript", framework: "express", label: "Express.js" },
    { language: "javascript", framework: "fastify", label: "Fastify" },
    { language: "javascript", framework: "koa", label: "Koa.js" },
    { language: "javascript", framework: "nestjs", label: "NestJS" },
    { language: "javascript", framework: "nodejs", label: "Node.js" },
    { language: "javascript", framework: "electron", label: "Electron" },
    { language: "javascript", framework: "reactnative", label: "React Native" },
    { language: "javascript", framework: "ionic", label: "Ionic" },
  
    // TypeScript Frameworks
    { language: "typescript", framework: "react", label: "React (TS)" },
    { language: "typescript", framework: "vue", label: "Vue.js (TS)" },
    { language: "typescript", framework: "angular", label: "Angular (TS)" },
    { language: "typescript", framework: "nextjs", label: "Next.js (TS)" },
    { language: "typescript", framework: "nestjs", label: "NestJS (TS)" },
    { language: "typescript", framework: "express", label: "Express (TS)" },
  
    // Python Frameworks
    { language: "python", framework: "fastapi", label: "FastAPI" },
    { language: "python", framework: "django", label: "Django" },
    { language: "python", framework: "flask", label: "Flask" },
    { language: "python", framework: "tornado", label: "Tornado" },
    { language: "python", framework: "pyramid", label: "Pyramid" },
    { language: "python", framework: "bottle", label: "Bottle" },
    { language: "python", framework: "cherrypy", label: "CherryPy" },
    { language: "python", framework: "streamlit", label: "Streamlit" },
    { language: "python", framework: "gradio", label: "Gradio" },
  
    // Java Frameworks
    { language: "java", framework: "spring", label: "Spring Boot" },
    { language: "java", framework: "springmvc", label: "Spring MVC" },
    { language: "java", framework: "quarkus", label: "Quarkus" },
    { language: "java", framework: "micronaut", label: "Micronaut" },
    { language: "java", framework: "vertx", label: "Vert.x" },
    { language: "java", framework: "dropwizard", label: "Dropwizard" },
  
    // Go Frameworks
    { language: "go", framework: "gin", label: "Gin" },
    { language: "go", framework: "echo", label: "Echo" },
    { language: "go", framework: "fiber", label: "Fiber" },
    { language: "go", framework: "chi", label: "Chi" },
    { language: "go", framework: "gorilla", label: "Gorilla Mux" },
    { language: "go", framework: "beego", label: "Beego" },
  
    // Rust Frameworks
    { language: "rust", framework: "actix", label: "Actix Web" },
    { language: "rust", framework: "warp", label: "Warp" },
    { language: "rust", framework: "rocket", label: "Rocket" },
    { language: "rust", framework: "axum", label: "Axum" },
    { language: "rust", framework: "tide", label: "Tide" },
  
    // C# Frameworks
    { language: "csharp", framework: "aspnet", label: "ASP.NET Core" },
    { language: "csharp", framework: "blazor", label: "Blazor" },
    { language: "csharp", framework: "maui", label: ".NET MAUI" },
    { language: "csharp", framework: "wpf", label: "WPF" },
    { language: "csharp", framework: "winforms", label: "Windows Forms" },
  
    // PHP Frameworks
    { language: "php", framework: "laravel", label: "Laravel" },
    { language: "php", framework: "symfony", label: "Symfony" },
    { language: "php", framework: "codeigniter", label: "CodeIgniter" },
    { language: "php", framework: "cakephp", label: "CakePHP" },
    { language: "php", framework: "slim", label: "Slim" },
    { language: "php", framework: "phalcon", label: "Phalcon" },
  
    // Ruby Frameworks
    { language: "ruby", framework: "rails", label: "Ruby on Rails" },
    { language: "ruby", framework: "sinatra", label: "Sinatra" },
    { language: "ruby", framework: "hanami", label: "Hanami" },
    { language: "ruby", framework: "grape", label: "Grape" },
  
    // Swift Frameworks
    { language: "swift", framework: "vapor", label: "Vapor" },
    { language: "swift", framework: "perfect", label: "Perfect" },
    { language: "swift", framework: "kitura", label: "Kitura" },
    { language: "swift", framework: "swiftui", label: "SwiftUI" },
    { language: "swift", framework: "uikit", label: "UIKit" },
  
    // Kotlin Frameworks
    { language: "kotlin", framework: "ktor", label: "Ktor" },
    { language: "kotlin", framework: "spring", label: "Spring Boot (Kotlin)" },
    { language: "kotlin", framework: "android", label: "Android (Kotlin)" },
    { language: "kotlin", framework: "compose", label: "Jetpack Compose" },
  
    // Dart Frameworks
    { language: "dart", framework: "flutter", label: "Flutter" },
    { language: "dart", framework: "aqueduct", label: "Aqueduct" },
    { language: "dart", framework: "shelf", label: "Shelf" },
  
    // Other Specialized Frameworks
    { language: "elixir", framework: "phoenix", label: "Phoenix" },
    { language: "clojure", framework: "ring", label: "Ring" },
    { language: "scala", framework: "akka", label: "Akka HTTP" },
    { language: "scala", framework: "play", label: "Play Framework" },
  ]
  
  export function detectLanguageFromCode(code: string): string {
    const lowerCode = code.toLowerCase()
  
    // JavaScript/TypeScript patterns
    if (lowerCode.includes("const ") || lowerCode.includes("let ") || lowerCode.includes("var ")) {
      if (lowerCode.includes(": string") || lowerCode.includes(": number") || lowerCode.includes("interface ")) {
        return "typescript"
      }
      return "javascript"
    }
  
    // Python patterns
    if (lowerCode.includes("def ") || lowerCode.includes("import ") || lowerCode.includes("from ")) {
      return "python"
    }
  
    // Java patterns
    if (lowerCode.includes("public class") || lowerCode.includes("public static void main")) {
      return "java"
    }
  
    // Go patterns
    if (lowerCode.includes("func ") || lowerCode.includes("package main")) {
      return "go"
    }
  
    // Rust patterns
    if (lowerCode.includes("fn ") || lowerCode.includes("let mut")) {
      return "rust"
    }
  
    // C# patterns
    if (lowerCode.includes("using System") || lowerCode.includes("public class")) {
      return "csharp"
    }
  
    // PHP patterns
    if (lowerCode.includes("<?php") || lowerCode.includes("$")) {
      return "php"
    }
  
    // Ruby patterns
    if (lowerCode.includes("def ") && lowerCode.includes("end")) {
      return "ruby"
    }
  
    return "javascript" // default
  }
  
  export function detectFrameworkFromCode(code: string): string | undefined {
    const lowerCode = code.toLowerCase()
  
    // React patterns
    if (lowerCode.includes("usestate") || lowerCode.includes("useeffect") || lowerCode.includes("jsx")) {
      return "react"
    }
  
    // Vue patterns
    if (lowerCode.includes("<template>") || lowerCode.includes("vue")) {
      return "vue"
    }
  
    // Angular patterns
    if (lowerCode.includes("@component") || lowerCode.includes("@injectable")) {
      return "angular"
    }
  
    // Next.js patterns
    if (lowerCode.includes("next/") || lowerCode.includes("getserversideprops")) {
      return "nextjs"
    }
  
    // Express patterns
    if (lowerCode.includes("express") || lowerCode.includes("app.get")) {
      return "express"
    }
  
    // FastAPI patterns
    if (lowerCode.includes("fastapi") || lowerCode.includes("@app.")) {
      return "fastapi"
    }
  
    // Django patterns
    if (lowerCode.includes("django") || lowerCode.includes("models.model")) {
      return "django"
    }
  
    // Flask patterns
    if (lowerCode.includes("flask") || lowerCode.includes("@app.route")) {
      return "flask"
    }
  
    return undefined
  }
  