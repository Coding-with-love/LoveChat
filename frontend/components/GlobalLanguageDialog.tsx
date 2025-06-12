"use client"

import { useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Search, X } from "lucide-react"
import { useLanguageDialogStore } from "../stores/LanguageDialogStore"
import { useState } from "react"

const LANGUAGES = [
  "Arabic",
  "Bengali",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Czech",
  "Danish",
  "Dutch",
  "English",
  "Finnish",
  "French",
  "German",
  "Greek",
  "Hebrew",
  "Hindi",
  "Hungarian",
  "Indonesian",
  "Italian",
  "Japanese",
  "Korean",
  "Malay",
  "Norwegian",
  "Persian",
  "Polish",
  "Portuguese",
  "Romanian",
  "Russian",
  "Spanish",
  "Swedish",
  "Thai",
  "Turkish",
  "Ukrainian",
  "Vietnamese",
]

export default function GlobalLanguageDialog() {
  const { isOpen, selectedText, onSelectLanguage, closeDialog } = useLanguageDialogStore()
  const [searchTerm, setSearchTerm] = useState("")

  // Reset search term when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("")
    }
  }, [isOpen])

  const filteredLanguages = LANGUAGES.filter((language) => language.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleSelect = (language: string) => {
    console.log("🌍 Language selected:", language, "for text:", selectedText)
    onSelectLanguage(language)
    closeDialog()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Language for Translation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search languages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-1">
              {filteredLanguages.map((language) => (
                <Button
                  key={language}
                  variant="ghost"
                  className="w-full justify-start h-10"
                  onClick={() => handleSelect(language)}
                >
                  {language}
                </Button>
              ))}
              {filteredLanguages.length === 0 && (
                <div className="text-center text-muted-foreground py-4">No languages found</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
