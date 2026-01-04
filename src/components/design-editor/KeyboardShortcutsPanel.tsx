'use client'

import { useState, useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface KeyboardShortcutsPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface Shortcut {
  keys: string[]
  description: string
}

interface ShortcutCategory {
  name: string
  shortcuts: Shortcut[]
}

const SHORTCUTS: ShortcutCategory[] = [
  {
    name: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo' },
      { keys: ['Ctrl', 'S'], description: 'Save design' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Deselect all' },
    ],
  },
  {
    name: 'Editing',
    shortcuts: [
      { keys: ['Ctrl', 'C'], description: 'Copy' },
      { keys: ['Ctrl', 'X'], description: 'Cut' },
      { keys: ['Ctrl', 'V'], description: 'Paste' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate' },
      { keys: ['Del'], description: 'Delete selected object' },
      { keys: ['Ctrl', 'A'], description: 'Select all' },
    ],
  },
  {
    name: 'Layers',
    shortcuts: [
      { keys: ['Ctrl', ']'], description: 'Bring forward' },
      { keys: ['Ctrl', '['], description: 'Send backward' },
      { keys: ['Ctrl', 'Shift', ']'], description: 'Bring to front' },
      { keys: ['Ctrl', 'Shift', '['], description: 'Send to back' },
      { keys: ['Ctrl', 'G'], description: 'Group selected objects' },
      { keys: ['Ctrl', 'Shift', 'G'], description: 'Ungroup' },
    ],
  },
  {
    name: 'Object Properties',
    shortcuts: [
      { keys: ['Ctrl', 'L'], description: 'Lock/Unlock selected' },
      { keys: ['Alt', 'Drag'], description: 'Duplicate while dragging' },
      { keys: ['Shift', 'Drag'], description: 'Constrain proportions' },
      { keys: ['Shift', 'Resize'], description: 'Resize from center' },
    ],
  },
  {
    name: 'Text Editing',
    shortcuts: [
      { keys: ['Ctrl', 'B'], description: 'Bold' },
      { keys: ['Ctrl', 'I'], description: 'Italic' },
      { keys: ['Ctrl', 'U'], description: 'Underline' },
      { keys: ['Ctrl', 'Shift', 'L'], description: 'Align left' },
      { keys: ['Ctrl', 'Shift', 'C'], description: 'Align center' },
      { keys: ['Ctrl', 'Shift', 'R'], description: 'Align right' },
    ],
  },
  {
    name: 'View',
    shortcuts: [
      { keys: ['Ctrl', '+'], description: 'Zoom in' },
      { keys: ['Ctrl', '-'], description: 'Zoom out' },
      { keys: ['Ctrl', '0'], description: 'Reset zoom to 100%' },
      { keys: ['Ctrl', '1'], description: 'Fit to screen' },
      { keys: ['Space', 'Drag'], description: 'Pan canvas' },
    ],
  },
  {
    name: 'Quick Add',
    shortcuts: [
      { keys: ['T'], description: 'Add text' },
      { keys: ['R'], description: 'Add rectangle' },
      { keys: ['C'], description: 'Add circle' },
      { keys: ['L'], description: 'Add line' },
      { keys: ['I'], description: 'Add image' },
    ],
  },
]

export default function KeyboardShortcutsPanel({ isOpen, onClose }: KeyboardShortcutsPanelProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Keyboard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-500">Quick reference for all available shortcuts</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {SHORTCUTS.map((category, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-4">
                <h3 className="mb-3 font-semibold text-gray-900">{category.name}</h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center">
                            <kbd className="min-w-[2rem] rounded border border-gray-300 bg-gray-50 px-2 py-1 text-center text-xs font-medium text-gray-700 shadow-sm">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="mx-1 text-gray-400">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Tip */}
          <div className="mt-6 rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <strong>Tip:</strong> Press <kbd className="rounded border border-blue-200 bg-white px-1.5 py-0.5 text-xs">?</kbd> at any time to show this shortcuts panel.
              Press <kbd className="rounded border border-blue-200 bg-white px-1.5 py-0.5 text-xs">Esc</kbd> to close it.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
