'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CustomizationPanelProps {
  customization: {
    primaryColor: string
    secondaryColor: string
    fontFamily: string
    logoUrl?: string
  }
  onUpdate: (updates: Partial<CustomizationPanelProps['customization']>) => void
}

const FONT_OPTIONS = [
  { value: 'Georgia, serif', label: 'Georgia (Classic)' },
  { value: 'Arial, sans-serif', label: 'Arial (Modern)' },
  { value: '"Helvetica Neue", sans-serif', label: 'Helvetica (Clean)' },
  { value: '"Times New Roman", serif', label: 'Times New Roman (Traditional)' },
  { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet (Friendly)' },
  { value: '"Courier New", monospace', label: 'Courier (Vintage)' },
]

export default function CustomizationPanel({ customization, onUpdate }: CustomizationPanelProps) {
  return (
    <div className="space-y-6 rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Customize Your Menu</h2>

      {/* Primary Color */}
      <div className="space-y-2">
        <Label htmlFor="primaryColor">Primary Color (Headings)</Label>
        <div className="flex gap-2">
          <Input
            id="primaryColor"
            type="color"
            value={customization.primaryColor}
            onChange={e => onUpdate({ primaryColor: e.target.value })}
            className="h-10 w-20"
          />
          <Input
            type="text"
            value={customization.primaryColor}
            onChange={e => onUpdate({ primaryColor: e.target.value })}
            className="flex-1"
            placeholder="#000000"
          />
        </div>
      </div>

      {/* Secondary Color */}
      <div className="space-y-2">
        <Label htmlFor="secondaryColor">Secondary Color (Prices & Accents)</Label>
        <div className="flex gap-2">
          <Input
            id="secondaryColor"
            type="color"
            value={customization.secondaryColor}
            onChange={e => onUpdate({ secondaryColor: e.target.value })}
            className="h-10 w-20"
          />
          <Input
            type="text"
            value={customization.secondaryColor}
            onChange={e => onUpdate({ secondaryColor: e.target.value })}
            className="flex-1"
            placeholder="#000000"
          />
        </div>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <Label htmlFor="fontFamily">Font Style</Label>
        <Select value={customization.fontFamily} onValueChange={value => onUpdate({ fontFamily: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map(font => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label htmlFor="logo">Logo (Optional)</Label>
        {customization.logoUrl && (
          <div className="mb-2 flex items-center gap-2">
            <img src={customization.logoUrl} alt="Logo preview" className="h-16 w-auto rounded border" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdate({ logoUrl: undefined })}
            >
              Remove
            </Button>
          </div>
        )}
        <Input
          id="logo"
          type="url"
          placeholder="https://example.com/logo.png"
          value={customization.logoUrl || ''}
          onChange={e => onUpdate({ logoUrl: e.target.value })}
        />
        <p className="text-xs text-gray-500">
          Enter a URL to your logo image (or upload feature coming soon)
        </p>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <Label>Quick Presets</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate({
              primaryColor: '#1a1a1a',
              secondaryColor: '#d4af37',
              fontFamily: 'Georgia, serif'
            })}
          >
            Classic Elegant
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate({
              primaryColor: '#2563eb',
              secondaryColor: '#dc2626',
              fontFamily: 'Arial, sans-serif'
            })}
          >
            Modern Bold
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate({
              primaryColor: '#059669',
              secondaryColor: '#f59e0b',
              fontFamily: '"Helvetica Neue", sans-serif'
            })}
          >
            Fresh & Bright
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate({
              primaryColor: '#7c2d12',
              secondaryColor: '#ea580c',
              fontFamily: '"Times New Roman", serif'
            })}
          >
            Rustic Warm
          </Button>
        </div>
      </div>
    </div>
  )
}
