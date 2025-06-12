import { create } from 'zustand'

interface LanguageDialogState {
  isOpen: boolean
  selectedText: string
  onSelectLanguage: (language: string) => void
  openDialog: (text: string, callback: (language: string) => void) => void
  closeDialog: () => void
}

export const useLanguageDialogStore = create<LanguageDialogState>((set) => ({
  isOpen: false,
  selectedText: '',
  onSelectLanguage: () => {},
  openDialog: (text, callback) => set({ 
    isOpen: true, 
    selectedText: text, 
    onSelectLanguage: callback 
  }),
  closeDialog: () => set({ isOpen: false }),
}))
