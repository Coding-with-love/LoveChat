import type React from "react"
import type { Metadata } from "next"
import {
  Geist,
  Geist_Mono,
  Inter,
  JetBrains_Mono,
  Roboto,
  Open_Sans,
  Fira_Code,
  Fira_Mono,
  Source_Code_Pro,
} from "next/font/google"
import "./globals.css"
import "./themes.css"
import "katex/dist/katex.min.css"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/frontend/components/ui/ThemeProvider"
import { AuthProvider } from "@/frontend/components/AuthProvider"
import { Analytics } from "@vercel/analytics/react"
import { Suspense } from "react"

// Load all fonts that users can select from
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
})

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
})

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  display: "swap",
})

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  display: "swap",
})

const firaMono = Fira_Mono({
  variable: "--font-fira-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
})

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "LoveChat",
  description: "Your personalized AI chat assistant with advanced customization",
  keywords: ["AI", "chat", "assistant", "customizable", "themes"],
  authors: [{ name: "LoveChat Team" }],
  viewport: "width=device-width, initial-scale=1",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const fontVariables = [
    geistSans.variable,
    geistMono.variable,
    inter.variable,
    jetbrainsMono.variable,
    roboto.variable,
    openSans.variable,
    firaCode.variable,
    firaMono.variable,
    sourceCodePro.variable,
  ].join(" ")

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to font services for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap"
          as="style"
        />
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&display=swap"
          as="style"
        />

        {/* PWA and App Icon metadata */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LoveChat" />
      </head>
      <body className={`${fontVariables} antialiased font-sans`}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }
          >
            <AuthProvider>
              {children}
              <Toaster
                richColors
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))",
                    border: "1px solid hsl(var(--border))",
                  },
                }}
              />
            </AuthProvider>
          </Suspense>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
