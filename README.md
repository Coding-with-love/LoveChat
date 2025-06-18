# LoveChat - Advanced AI Chat Application 🚀

**A T3 Chat Cloneathon Competition Entry**

LoveChat is a sophisticated, feature-rich AI chat application built for the **T3 Chat Cloneathon**. This entry showcases cutting-edge AI capabilities combined with professional-grade user experience, offering an extensive suite of features for AI-powered conversations, content creation, and productivity. Built for power users and developers, it demonstrates the pinnacle of modern chat application development.

## 🏆 T3 Chat Cloneathon Entry

This project is an official entry in the T3 Chat Cloneathon competition, showcasing:
- **Innovation**: Advanced features beyond traditional chat applications
- **Technical Excellence**: Modern tech stack with TypeScript, Next.js 15, and Supabase
- **User Experience**: Intuitive design with comprehensive accessibility
- **AI Integration**: Multi-provider AI support with cutting-edge models
- **Community Focus**: Built for developers and power users

## 🌟 Core Features

### 🤖 Advanced AI Integration

#### Multi-Provider AI Support
- **OpenAI Models**: GPT-4o, GPT-4o-mini, GPT-4-turbo, O1-preview, O1-mini, O3, O3-mini, O4-mini
- **Google AI Models**: Gemini 2.0 Flash, Gemini 1.5 Pro/Flash, Gemini 2.5 Pro/Flash (with thinking capabilities)
- **OpenRouter Models**: Claude 3.5 Sonnet/Haiku, Llama 3.1 (405B/70B/8B), Qwen models, Anthropic models
- **Ollama Integration**: Local model support with automatic model detection and thinking capabilities
- **DeepSeek Integration**: Advanced reasoning models with competitive performance

#### Smart API Key Management
- **Flexible Key System**: User keys take priority, with optional server fallback keys
- **Provider Requirements**: OpenAI and OpenRouter require user keys, Google models optional
- **Real-time Validation**: Automatic key validation and error handling
- **Environment Fallbacks**: Server-side default keys for seamless user experience

#### Reasoning & Thinking Models
- **Real-time Thinking Display**: Live visualization of AI reasoning process during generation
- **Reasoning Model Support**: Full support for O1/O3 series and Gemini thinking models
- **Expandable Thinking Views**: Collapsible reasoning sections with syntax highlighting
- **Thinking Summaries**: OpenAI reasoning summary integration (requires feature flag access)
- **Reasoning Effort Control**: User-selectable reasoning effort levels (low/medium/high)

### 🔍 Advanced Web Search Integration

#### Serper API Google Search
- **Real-time Web Search**: Powered by Serper API for high-quality Google search results
- **Multi-Query Support**: Execute multiple search queries simultaneously with rate limiting
- **Intelligent URL Processing**: Advanced URL extraction from Google intermediate redirects
- **Source Attribution**: Automatic source links with proper domain extraction
- **Search Result Enhancement**: Knowledge graphs, answer boxes, and organic results
- **Domain Deduplication**: Smart deduplication by domain and URL to ensure diverse results

#### Smart Search Features
- **Auto-Detection**: Automatically enables search based on query patterns and keywords
- **Visual Search Indicators**: Clear UI indicators when web search is active
- **Streaming Search Results**: Real-time search result display during AI generation
- **Search History**: Track and reference previous search queries
- **Fallback Systems**: Multiple fallback mechanisms for robust search functionality

#### Search UI Components
- **WebSearchBanner**: Elegant horizontal scrolling search results with favicon support
- **ChatSearchResults**: Integrated search results display within conversations
- **Search Annotations**: Comprehensive search metadata and status tracking
- **Responsive Design**: Touch-friendly scrolling and mobile-optimized search display

### 🎭 Personas & Templates System

#### AI Personas
- **Custom Personas**: Create AI assistants with specific personalities and expertise
- **System Prompts**: Full system prompt customization for each persona
- **Thread-specific Personas**: Assign different personas to different conversations
- **Default Persona System**: Set global default personas
- **Persona Management**: Full CRUD operations with avatar emojis and color coding

#### Prompt Templates
- **Template Variables**: Dynamic templates with user-input variables
- **Category Organization**: Organize templates by category and tags
- **Template Sharing**: Public and private template sharing
- **Usage Analytics**: Track template usage and popularity
- **Variable Processing**: Real-time variable substitution with validation

### 🎨 Artifacts System

#### Auto-Generated Artifacts
- **Smart Code Detection**: Automatically extracts and saves code blocks as artifacts
- **Document Generation**: Converts structured content to document artifacts
- **Multi-language Support**: Supports 20+ programming languages and formats
- **Content Analysis**: Intelligent detection of substantial content worth preserving
- **Visual Indicators**: Hover indicators show when content has been saved as artifacts

#### Artifact Management
- **Gallery View**: Visual artifact browser with search and filtering
- **Version Control**: Full version history with restore capabilities
- **Cross-chat References**: Reference artifacts across different conversations
- **Project Organization**: Group artifacts by projects and threads
- **Export & Download**: Download artifacts in original formats

#### Artifact Features
- **Live Preview**: Syntax-highlighted code preview with theme support
- **Copy & Reference**: Easy copying and cross-referencing between chats
- **Pinning System**: Pin important artifacts for quick access
- **Tag System**: Organize with custom tags and metadata
- **Search Functionality**: Full-text search across all artifacts

### 📁 Advanced File Handling

#### Comprehensive File Support
- **Document Processing**: PDF, DOC, TXT with intelligent text extraction
- **Image Analysis**: Image upload with AI-powered analysis and description
- **Code Files**: Full syntax highlighting for 50+ file types
- **Archive Support**: ZIP, RAR, TAR file handling
- **Media Files**: Video, audio file metadata extraction

#### Intelligent PDF Processing
- **Multiple Extraction Methods**: Google Docs parser, pdf-parse, custom OCR
- **Fallback Systems**: Graceful degradation when extraction fails
- **Layout Preservation**: Maintains document structure and formatting
- **Error Handling**: Comprehensive error messages and user guidance

#### File Management
- **Attachment Gallery**: Visual file browser with search and filtering
- **Storage Analytics**: File size tracking and storage usage monitoring
- **Batch Operations**: Multiple file selection and bulk actions
- **Thread Organization**: Files organized by conversation threads

### 🔊 Text-to-Speech Integration

#### ElevenLabs Voice Synthesis
- **High-Quality Voices**: Premium AI voice synthesis with natural intonation
- **Multiple Voice Options**: Choose from various voice personalities and styles
- **Real-time Generation**: Convert AI responses to speech instantly
- **Streaming Audio**: Progressive audio playback as text is generated
- **Voice Customization**: Adjust voice settings, speed, and clarity

#### Audio Controls
- **Play/Pause Controls**: Full audio playback control with progress tracking
- **Background Playback**: Continue listening while using other features
- **Audio Queue**: Queue multiple messages for continuous listening
- **Download Audio**: Save generated audio files for offline use
- **Accessibility Support**: Screen reader compatible audio controls

#### Smart Audio Features
- **Auto-Play Options**: Automatically play AI responses when enabled
- **Message Selection**: Choose specific messages to convert to speech
- **Batch Processing**: Convert entire conversations to audio
- **Audio History**: Access previously generated audio files
- **Integration Controls**: Seamless integration with chat interface

### ⚡ Workflow Builder & Automation

#### Visual Workflow Designer
- **Drag-and-Drop Interface**: Intuitive workflow creation with visual step builder
- **Multi-Step Workflows**: Create complex automation sequences with multiple AI interactions
- **Conditional Logic**: Add branching logic and decision points in workflows
- **Variable Management**: Pass data between workflow steps with dynamic variables
- **Template Library**: Pre-built workflow templates for common use cases

#### Workflow Execution
- **Real-time Execution**: Live workflow execution with step-by-step progress tracking
- **Streaming Results**: Real-time display of each workflow step as it executes
- **Error Handling**: Robust error handling with retry mechanisms and fallbacks
- **Execution History**: Complete audit trail of workflow runs and results
- **Performance Metrics**: Track execution time and success rates

#### Advanced Workflow Features
- **Step-Level Web Search**: Enable web search for specific workflow steps
- **AI Model Selection**: Choose different AI models for different workflow steps
- **Input Validation**: Validate user inputs before workflow execution
- **Output Formatting**: Format and structure workflow outputs automatically
- **Workflow Sharing**: Share workflows with team members and the community

#### Workflow Types & Templates
- **Content Creation**: Blog posts, articles, and marketing content workflows
- **Code Generation**: Multi-step code development and review workflows
- **Research & Analysis**: Data gathering and analysis automation
- **Document Processing**: Automated document analysis and summarization
- **Custom Workflows**: Build completely custom automation sequences

#### Workflow Management
- **Workflow Library**: Organize and manage your workflow collection
- **Version Control**: Track workflow changes and maintain version history
- **Execution Scheduling**: Schedule workflows to run at specific times
- **Collaboration Tools**: Share and collaborate on workflow development
- **Import/Export**: Backup and share workflows across different instances

### 💬 Advanced Chat Features

#### Real-time Communication
- **Streaming Responses**: Real-time AI response streaming with interruption support
- **Resumable Streams**: Resume interrupted conversations seamlessly
- **Message Editing**: Edit and regenerate messages with version tracking
- **Message Attempts**: Multiple AI response attempts with navigation
- **Circuit Breaker Protection**: Robust error handling and recovery mechanisms

#### Rich Content Support
- **Markdown Rendering**: Full markdown support with LaTeX math rendering
- **Syntax Highlighting**: Code syntax highlighting for 100+ languages using Shiki
- **File Attachments**: Drag-and-drop file uploads with preview
- **Artifact References**: Inline artifact references with live previews
- **Mathematical Expressions**: KaTeX integration for mathematical notation

#### Message Management
- **Pinning System**: Pin important messages for quick reference
- **Message History**: Persistent conversation history with cloud sync
- **Search & Filter**: Search across all conversations and messages
- **Export Options**: Export conversations in multiple formats (PDF, Markdown, JSON)
- **Message Navigator**: Visual navigation through conversation history

#### Chat Search & Navigation
- **Full-text Search**: Search across all messages in conversations
- **Search Highlighting**: Visual highlighting of search results
- **Result Navigation**: Navigate between search results with keyboard shortcuts
- **Search Persistence**: Remember search queries across sessions
- **Advanced Filters**: Filter by date, sender, content type

### ⌨️ Productivity Features

#### Comprehensive Keyboard Shortcuts
- **Navigation**: `Cmd+Shift+N` (New chat), `Cmd+B` (Toggle sidebar)
- **Conversation**: `Enter` (Send), `Cmd+Enter` (New line), `Esc` (Stop generation)
- **Messages**: `Cmd+C` (Copy), `Cmd+E` (Edit), `Cmd+Shift+P` (Pin/unpin)
- **Advanced**: `Cmd+Z` (Undo), `Cmd+Backspace` (Clear input)
- **Search**: `Cmd+F` (Search in chat), `Cmd+K` (Global search)

#### AI-Powered Text Actions
- **Context Menu Actions**: Right-click any text for AI actions
- **Explain**: Get detailed explanations of selected text
- **Translate**: Translate to 50+ languages with language selection
- **Rephrase**: AI-powered text rewriting and improvement
- **Summarize**: Intelligent text summarization

#### Code Conversion System
- **Multi-language Conversion**: Convert code between 20+ programming languages
- **Syntax Preservation**: Maintains code structure and logic
- **Batch Processing**: Convert multiple code blocks simultaneously
- **Error Handling**: Intelligent error detection and correction
- **Conversion History**: Track and manage code conversions

### 🎨 Customization & Theming

#### Advanced Theme System
- **Dark/Light Themes**: Multiple theme variants with smooth transitions
- **Custom Color Schemes**: Personalized color customization
- **Syntax Highlighting Themes**: Multiple code highlighting themes
- **Component Theming**: Granular theme control for all UI components
- **System Theme Detection**: Automatic theme switching based on system preferences

#### User Preferences
- **Custom Instructions**: Global AI behavior customization
- **Default Settings**: Personalized defaults for models, search, etc.
- **UI Preferences**: Layout, density, and interaction preferences
- **Cloud Sync**: Preferences synchronized across devices

### 🔄 Sharing & Collaboration

#### Conversation Sharing
- **Public Links**: Share conversations with public links
- **Access Control**: Control who can view shared conversations
- **Export Formats**: Export as PDF, Markdown, JSON
- **Conversation Summary**: AI-generated conversation summaries
- **Share Tokens**: Secure sharing with expirable tokens

#### Project Collaboration
- **Artifact Sharing**: Share code and documents across teams
- **Public Artifacts**: Community artifact sharing
- **Version Control**: Track changes and collaborate on artifacts
- **Cross-reference System**: Link related artifacts and conversations

### 🔧 Developer Features

#### Advanced Configuration
- **Model Configuration**: Granular model settings and parameters
- **API Management**: Comprehensive API key management
- **Debug Tools**: Built-in debugging and diagnostic tools
- **Performance Monitoring**: Real-time performance metrics

#### Integration Capabilities
- **Webhook Support**: Custom webhook integrations
- **API Access**: RESTful API for external integrations
- **Database Sync**: Real-time database synchronization
- **Export APIs**: Programmatic data export capabilities

### 📱 Cross-Platform Support

#### Responsive Design
- **Mobile Optimized**: Full mobile experience with touch gestures
- **Tablet Support**: Optimized layouts for tablet devices
- **Desktop Features**: Full desktop feature parity
- **Progressive Web App**: Installable PWA with offline capabilities

#### Accessibility
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and semantic HTML
- **High Contrast Mode**: Accessibility-focused color schemes
- **Font Scaling**: Adjustable font sizes and zoom support

## 🛠 Technical Stack

### Frontend Technologies
- **Next.js 15**: Latest React framework with App Router and Turbopack
- **React 19**: Latest React with concurrent features
- **TypeScript 5.8**: Full type safety and advanced type features
- **Tailwind CSS 4**: Latest utility-first CSS framework
- **Radix UI**: Accessible component primitives and design system
- **Framer Motion**: Advanced animations and transitions
- **React Router 7**: Modern client-side routing

### State Management & Data
- **Zustand**: Lightweight state management
- **TanStack Query**: Powerful server state management
- **SWR**: Additional data fetching and caching
- **Dexie**: IndexedDB wrapper for client-side storage
- **React Hook Form**: Performant form management

### AI & Integration
- **AI SDK**: Unified AI provider integration
- **OpenAI SDK**: Direct OpenAI API integration
- **Google Generative AI**: Gemini model integration
- **OpenRouter Provider**: Multi-model access
- **Anthropic SDK**: Claude model integration
- **DeepSeek SDK**: Advanced reasoning models

### Backend & Database
- **Supabase**: PostgreSQL database with real-time subscriptions
- **Supabase Auth**: Authentication and user management
- **Supabase Storage**: File storage and management
- **Edge Functions**: Serverless API endpoints
- **Real-time Subscriptions**: Live data synchronization

### Development Tools
- **ESLint**: Code linting and quality assurance
- **TypeScript**: Static type checking
- **Turbopack**: Fast build tool and bundler
- **Vercel Analytics**: Performance monitoring

### External Services
- **Serper API**: Google search integration
- **ElevenLabs**: Text-to-speech synthesis
- **PDF.js**: PDF processing and rendering
- **KaTeX**: Mathematical expression rendering

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ (Latest LTS recommended)
- npm 9+ or yarn package manager
- Supabase account (for database and authentication)

### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/coding-with-love/t3clone.git
cd LoveChat
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
```

3. **Environment Configuration:**
Create a `.env.local` file with the following variables:

```env
# Required - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Required - Web Search (Serper API)
SERPER_API_KEY=your_serper_api_key_here

# Optional - Default AI API Keys for Better UX
# Users can start chatting immediately with these fallback keys
# They can add their own keys later to use their own quotas

# Google AI API Key (Get from: https://makersuite.google.com/app/apikey)  
GOOGLE_API_KEY=your_google_api_key_here

# Optional - Only if you want server fallbacks (NOT REQUIRED)
# OpenAI API Key (Get from: https://platform.openai.com/api-keys)
# OPENAI_API_KEY=your_openai_api_key_here

# OpenRouter API Key (Get from: https://openrouter.ai/keys)
# OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional - Ollama Configuration (for local models)
OLLAMA_URL=http://localhost:11434

# Optional - Text-to-Speech Configuration
# ElevenLabs API Key (Get from: https://elevenlabs.io/app/settings/api-keys)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### API Key Strategy

**Important**: This application uses a sophisticated API key system:

- **Google Models**: Uses server fallback keys (optional user keys)
- **OpenAI Models**: Requires user-provided keys (no server fallback)
- **OpenRouter Models**: Requires user-provided keys (no server fallback)
- **Ollama Models**: No keys required (local models)
- **Serper API**: Required for web search functionality

This ensures users must provide their own keys for OpenAI/OpenRouter while keeping Google models accessible by default.

4. **Database Setup:**
```bash
# Set up Supabase project and get connection details
# Configure authentication providers in Supabase dashboard
# Set up storage buckets for file uploads
# Run any provided migrations
```

5. **Development Server:**
```bash
npm run dev
# or
yarn dev
```

6. **Production Build:**
```bash
npm run build
npm start
```

## 📖 Usage Guide

### Getting Started

1. **Create Account**: Sign up with email or OAuth providers
2. **Configure API Keys**: Add your API keys in Settings > API Configuration
3. **Choose AI Model**: Select from available models in the chat interface
4. **Start Chatting**: Begin your conversation with AI assistance

### Advanced Usage

#### Working with Personas
1. Navigate to Settings > Personas
2. Create custom personas with specific roles
3. Assign personas to conversations
4. Use prompt templates for consistent interactions

#### Managing Artifacts
1. Code and documents are automatically saved as artifacts
2. Access Artifacts Gallery from the sidebar
3. Search, filter, and organize your artifacts
4. Reference artifacts in new conversations

#### File Processing
1. Drag and drop files into the chat
2. Supported formats: PDF, images, code files, documents
3. AI automatically analyzes and extracts content
4. Reference uploaded files in conversations

#### Web Search Usage
1. **Automatic Detection**: Web search automatically enables based on query patterns
2. **Manual Toggle**: Use the search toggle in chat settings to force enable/disable
3. **Search Indicators**: Look for search icons and "🔍 Executing web search" messages
4. **Result Display**: Search results appear in elegant horizontal cards with favicons
5. **Source Attribution**: Click on result cards to visit original sources

#### Text-to-Speech Usage
1. **Enable TTS**: Configure ElevenLabs API key in Settings > API Configuration
2. **Voice Selection**: Choose your preferred voice in Settings > Text-to-Speech
3. **Play Messages**: Click the speaker icon on any AI message to hear it
4. **Auto-Play**: Enable auto-play in settings for automatic speech generation
5. **Audio Controls**: Use play/pause controls and adjust playback speed

#### Workflow Builder Usage
1. **Access Builder**: Click the workflow icon in the sidebar or chat interface
2. **Create Workflow**: Use "New Workflow" to start building automation sequences
3. **Add Steps**: Define each step with prompts, descriptions, and AI model selection
4. **Configure Variables**: Set up input variables and step-to-step data passing
5. **Enable Web Search**: Toggle web search for specific steps that need real-time data
6. **Execute in Chat**: Run workflows directly in chat conversations with real-time progress
7. **Manage Workflows**: Organize, edit, and share workflows in the workflow library

#### Keyboard Shortcuts
- Press `Cmd+K` to open the shortcuts dialog
- Use `Cmd+B` to toggle the sidebar
- Press `Cmd+Shift+N` for new conversations
- Use `Esc` to stop AI generation
- Press `Cmd+F` to search within conversations

## 🎯 Advanced Configuration

### Model Configuration
```typescript
// Custom model configuration
const modelConfig = {
  provider: "openai",
  modelId: "gpt-4o",
  supportsSearch: true,
  supportsThinking: false,
  customPrompts: {...}
}
```

### Persona Customization
```typescript
// Advanced persona setup
const customPersona = {
  name: "Code Reviewer",
  systemPrompt: "You are an expert code reviewer...",
  avatarEmoji: "🔍",
  color: "#3B82F6",
  defaultModel: "gpt-4o"
}
```

### Web Search Configuration
```typescript
// Advanced search settings
const searchConfig = {
  provider: "serper",
  autoDetection: true,
  maxResults: 5,
  deduplication: true,
  domainInference: true,
  urlProcessing: "enhanced"
}
```

### Text-to-Speech Configuration
```typescript
// Custom TTS settings
const ttsConfig = {
  provider: "elevenlabs",
  defaultVoice: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
  voiceSettings: {
    stability: 0.5,
    similarityBoost: 0.5,
    style: 0.0,
    useSpeakerBoost: true
  },
  autoPlay: false,
  playbackSpeed: 1.0
}
```

### Workflow Configuration
```typescript
// Advanced workflow setup
const workflowConfig = {
  name: "Content Creation Pipeline",
  description: "Multi-step content creation and optimization",
  steps: [
    {
      id: "research",
      name: "Research Phase",
      prompt: "Research the topic: {{topic}}",
      webSearchEnabled: true,
      outputVariable: "research_data"
    },
    {
      id: "outline",
      name: "Create Outline",
      prompt: "Create an outline based on: {{research_data}}",
      outputVariable: "content_outline"
    },
    {
      id: "content",
      name: "Generate Content",
      prompt: "Write content using outline: {{content_outline}}",
      outputVariable: "final_content"
    }
  ],
  variables: ["topic"],
  tags: ["content", "automation"]
}
```

### Theme Customization
```css
/* Custom theme variables */
:root {
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 84% 4.9%;
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
}
```

## 🐛 Troubleshooting

### Common Issues

**Models not appearing in selector:**
- Check API key configuration in Settings
- Verify provider requirements (OpenAI/OpenRouter need user keys)
- Check browser console for authentication errors

**Web search not working:**
- Verify SERPER_API_KEY is configured in environment variables
- Check if search is enabled in chat settings
- Look for search indicators in the chat interface
- Review browser console for search-related errors

**File upload failures:**
- Verify file size limits (50MB default)
- Check supported file formats
- Ensure Supabase storage is properly configured

**Streaming issues:**
- Check network connectivity
- Verify API key validity
- Try different models if one is failing

**Performance issues:**
- Clear browser cache and data
- Check available system memory
- Disable browser extensions that might interfere

**Text-to-Speech issues:**
- Verify ElevenLabs API key is configured correctly
- Check browser audio permissions and settings
- Ensure stable internet connection for voice generation
- Try different voices if one is not working
- Check ElevenLabs account quota and billing status

**Workflow execution problems:**
- Verify all required input variables are provided
- Check individual step configurations and prompts
- Ensure web search is enabled for steps that require it
- Review workflow execution logs for specific error details
- Test workflows with simpler steps to isolate issues

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# View API logs
tail -f logs/api.log

# Check database connections
npm run db:status
```

## 🏆 T3 Chat Cloneathon Features

This entry showcases several innovative features that distinguish it in the competition:

### 🌟 Unique Differentiators
- **Advanced Web Search**: Serper API integration with sophisticated URL processing
- **Multi-Modal AI Support**: Support for reasoning, thinking, and standard models
- **Workflow Automation**: Visual workflow builder with real-time execution
- **Artifact System**: Automatic code and document preservation with version control
- **Text-to-Speech**: High-quality voice synthesis with ElevenLabs integration
- **Code Conversion**: Multi-language code translation capabilities

### 🎯 Competition Advantages
- **Technical Innovation**: Cutting-edge features like resumable streams and circuit breakers
- **User Experience**: Intuitive design with comprehensive keyboard shortcuts

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **T3 Chat Cloneathon Community** for organizing this amazing competition
- **T3 Stack Community** for the amazing development tools
- **Vercel Team** for Next.js and deployment platform
- **Supabase Team** for the backend infrastructure
- **Radix UI Team** for accessible components
- **OpenAI, Google, and Anthropic** for AI model access
- **Serper** for Google search API access
- **ElevenLabs** for high-quality text-to-speech
- **Open Source Contributors** who made this possible

---

**Built with ❤️ for the T3 Chat Cloneathon and the AI community**

*This project represents the future of AI-powered chat applications, combining cutting-edge technology with exceptional user experience.*