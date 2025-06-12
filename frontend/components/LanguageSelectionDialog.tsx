"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Search, X } from 'lucide-react'

interface LanguageSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (language: string) => void
}

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

const LanguageSelectionDialog: React.FC<LanguageSelectionDialogProps> = ({ isOpen, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    console.log("🌍 Language dialog state changed:", { isOpen })
  }, [isOpen])

  const filteredLanguages = LANGUAGES.filter((language) => language.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleSelect = (language: string) => {
    console.log("🌍 Language selected:", language)
    onSelect(language)
    setSearchTerm("") // Reset search when closing
  }

  const handleClose = () => {
    console.log("🌍 Language dialog closing")
    onClose()
    setSearchTerm("") // Reset search when closing
  }

  const handleOpenChange = (open: boolean) => {
    console.log("🌍 Dialog open change:", open)
    if (!open) {
      handleClose()
    }
  }

  console.log("🌍 Rendering LanguageSelectionDialog with isOpen:", isOpen)

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Language</DialogTitle>
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

export default LanguageSelectionDialog
