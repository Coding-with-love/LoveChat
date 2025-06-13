// Map display language names to valid Shiki language identifiers
export const LANGUAGE_MAP: Record<string, string> = {
    // Core languages
    "javascript": "javascript",
    "typescript": "typescript", 
    "python": "python",
    "java": "java",
    "go": "go",
    "rust": "rust",
    "c#": "csharp",
    "csharp": "csharp",
    "c++": "cpp",
    "cpp": "cpp",
    "c": "c",
    "php": "php",
    "ruby": "ruby",
    "swift": "swift",
    "kotlin": "kotlin",
    "dart": "dart",
    "scala": "scala",
    "clojure": "clojure",
    "elixir": "elixir",
    "erlang": "erlang",
    "haskell": "haskell",
    "ocaml": "ocaml",
    "f#": "fsharp",
    "fsharp": "fsharp",
    "lua": "lua",
    "perl": "perl",
    "r": "r",
    "matlab": "matlab",
    "julia": "julia",
    "nim": "nim",
    "zig": "zig",
    "crystal": "crystal",
    
    // Web technologies
    "html": "html",
    "css": "css",
    "scss": "scss",
    "sass": "sass",
    "less": "less",
    "json": "json",
    "xml": "xml",
    "yaml": "yaml",
    "toml": "toml",
    
    // Shell/Config
    "bash": "bash",
    "shell": "bash",
    "sh": "bash",
    "zsh": "zsh",
    "fish": "fish",
    "powershell": "powershell",
    "dockerfile": "dockerfile",
    
    // Database
    "sql": "sql",
    "mysql": "sql",
    "postgresql": "sql",
    "sqlite": "sql",
    
    // Markup
    "markdown": "markdown",
    "md": "markdown",
    "tex": "latex",
    "latex": "latex",
    
    // Default fallback
    "text": "text",
    "plain": "text",
  }
  
  export function getShikiLanguage(language: string): string {
    const normalized = language.toLowerCase().trim()
    return LANGUAGE_MAP[normalized] || normalized || "text"
  }
  
  export function isValidShikiLanguage(language: string): boolean {
    const shikiLang = getShikiLanguage(language)
    // List of commonly supported Shiki languages
    const supportedLanguages = [
      "javascript", "typescript", "python", "java", "go", "rust", "csharp", 
      "cpp", "c", "php", "ruby", "swift", "kotlin", "dart", "scala", 
      "clojure", "elixir", "haskell", "lua", "r", "html", "css", "scss",
      "json", "xml", "yaml", "bash", "sql", "markdown", "text"
    ]
    return supportedLanguages.includes(shikiLang)
  }
  
  // Language options for dropdown menus
  export const languageOptions = [
    { label: "JavaScript", value: "javascript" },
    { label: "TypeScript", value: "typescript" },
    { label: "Python", value: "python" },
    { label: "Java", value: "java" },
    { label: "Go", value: "go" },
    { label: "Rust", value: "rust" },
    { label: "C#", value: "csharp" },
    { label: "C++", value: "cpp" },
    { label: "C", value: "c" },
    { label: "PHP", value: "php" },
    { label: "Ruby", value: "ruby" },
    { label: "Swift", value: "swift" },
    { label: "Kotlin", value: "kotlin" },
    { label: "Dart", value: "dart" },
    { label: "Scala", value: "scala" },
    { label: "Clojure", value: "clojure" },
    { label: "Elixir", value: "elixir" },
    { label: "Haskell", value: "haskell" },
    { label: "Lua", value: "lua" },
    { label: "R", value: "r" },
    { label: "HTML", value: "html" },
    { label: "CSS", value: "css" },
    { label: "SCSS", value: "scss" },
    { label: "JSON", value: "json" },
    { label: "XML", value: "xml" },
    { label: "YAML", value: "yaml" },
    { label: "Bash", value: "bash" },
    { label: "SQL", value: "sql" },
    { label: "Markdown", value: "markdown" },
  ]
  