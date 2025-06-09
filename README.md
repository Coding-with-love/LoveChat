# LoveChat - T3Chat Cloneathon Entry

LoveChat is a modern, feature-rich chat application built for the T3Chat Cloneathon competition. It combines the power of AI with real-time chat capabilities, offering a seamless and intuitive user experience.

##  Features

### Core Chat Features
- Real-time messaging with instant updates
- Message history persistence
- Markdown support with LaTeX math rendering
- Code syntax highlighting
- Message threading and replies
- Message search functionality
- Message interruption capabilities
- Resumable chat streams

### AI Integration
- Multiple AI model support (OpenAI, Google AI, OpenRouter)
- Context-aware conversations
- Stream-based responses for real-time interaction
- AI-powered chat completions
- Customizable AI parameters

### User Experience
- Dark/Light theme support
- Responsive design for all devices
- Toast notifications for user feedback
- Progress indicators for long-running operations
- Collapsible UI elements
- Tooltips for enhanced usability
- Avatar support for users
- Dialog-based interactions
- Dropdown menus for actions
- Scroll area with custom styling

### Data Management
- Offline support with IndexedDB (via Dexie.js)
- Real-time data synchronization
- Efficient state management with Zustand
- React Query for server state management
- Form validation with Zod

## 🛠 Tech Stack

### Frontend
- Next.js 15.3.2 (React 19)
- TypeScript
- Tailwind CSS
- Radix UI Components
- React Hook Form
- Zustand (State Management)
- React Query
- SWR (Data Fetching)

### Backend
- Next.js API Routes
- Supabase (Database)
- AI SDK Integration
  - OpenAI
  - Google AI
  - OpenRouter

### Development Tools
- ESLint
- TypeScript
- Tailwind CSS
- Turbopack (for development)

## 🚀 Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd t3clone
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:
```env
# Add your environment variables here
# Example:
# OPENAI_API_KEY=your_key_here
# SUPABASE_URL=your_supabase_url
# SUPABASE_ANON_KEY=your_supabase_key
```

4. Run the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
npm start
```

## 📝 Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code quality checks

## 🔧 Configuration

The application uses several configuration files:
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `components.json` - UI components configuration

##  Contributing

This project is part of the T3Chat Cloneathon competition. We welcome contributions from the community! Here's how you can contribute:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- T3Chat Cloneathon organizers
- All open-source contributors
- The Next.js team
- The React community
- The Supabase team
- The Radix UI team

## 🔗 Links

- [GitHub Repository](https://github.com/yourusername/t3clone)
- [Live Demo](https://your-demo-url.com)
- [T3Chat Cloneathon](https://t3chat-cloneathon.com)

## 📞 Support

If you encounter any issues or have questions, please:
1. Check the [Issues](https://github.com/yourusername/t3clone/issues) page
2. Create a new issue if your problem isn't already listed
3. Join our community discussions

## 🎯 Project Status

This project is actively maintained and developed as part of the T3Chat Cloneathon competition. We're continuously adding new features and improvements based on user feedback and competition requirements.