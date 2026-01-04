'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Download, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface GoogleFont {
  family: string
  category: string
  variants: string[]
  subsets: string[]
  files: Record<string, string>
}

interface FontManagerProps {
  onFontSelect?: (fontFamily: string) => void
  selectedFont?: string
}

const GOOGLE_FONTS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY || 'demo'

// Popular fonts to show first
const POPULAR_FONTS = [
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Oswald',
  'Raleway',
  'Playfair Display',
  'Merriweather',
  'Poppins',
  'Inter',
  'Dancing Script',
  'Lobster',
  'Pacifico',
  'Ubuntu',
  'Nunito',
  'PT Sans',
  'Crimson Text',
  'Abril Fatface',
  'Bebas Neue',
  'Great Vibes'
]

export default function FontManager({ onFontSelect, selectedFont }: FontManagerProps) {
  const [fonts, setFonts] = useState<GoogleFont[]>([])
  const [filteredFonts, setFilteredFonts] = useState<GoogleFont[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set())
  const [category, setCategory] = useState<string>('all')

  // Fetch Google Fonts
  useEffect(() => {
    fetchGoogleFonts()
  }, [])

  // Filter fonts based on search and category
  useEffect(() => {
    let result = fonts

    if (category !== 'all') {
      result = result.filter(font => font.category === category)
    }

    if (searchQuery) {
      result = result.filter(font =>
        font.family.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort: Popular fonts first, then alphabetically
    result = result.sort((a, b) => {
      const aIsPopular = POPULAR_FONTS.includes(a.family)
      const bIsPopular = POPULAR_FONTS.includes(b.family)

      if (aIsPopular && !bIsPopular) return -1
      if (!aIsPopular && bIsPopular) return 1

      return a.family.localeCompare(b.family)
    })

    setFilteredFonts(result)
  }, [fonts, searchQuery, category])

  const fetchGoogleFonts = async () => {
    try {
      setLoading(true)

      // In a real implementation, you'd fetch from Google Fonts API
      // For now, use a curated list of popular fonts
      const popularFontsList: GoogleFont[] = POPULAR_FONTS.map(family => ({
        family,
        category: getCategoryForFont(family),
        variants: ['regular', '700'],
        subsets: ['latin'],
        files: {
          regular: `https://fonts.gstatic.com/s/${family.toLowerCase().replace(/\s+/g, '')}/v1/${family.toLowerCase().replace(/\s+/g, '')}-regular.woff2`,
          '700': `https://fonts.gstatic.com/s/${family.toLowerCase().replace(/\s+/g, '')}/v1/${family.toLowerCase().replace(/\s+/g, '')}-700.woff2`
        }
      }))

      setFonts(popularFontsList)
      setFilteredFonts(popularFontsList)
    } catch (error) {
      console.error('Error fetching fonts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryForFont = (family: string): string => {
    const displayFonts = ['Playfair Display', 'Abril Fatface', 'Bebas Neue', 'Lobster']
    const handwritingFonts = ['Dancing Script', 'Pacifico', 'Great Vibes']
    const serifFonts = ['Merriweather', 'Crimson Text', 'PT Serif', 'Playfair Display']

    if (displayFonts.includes(family)) return 'display'
    if (handwritingFonts.includes(family)) return 'handwriting'
    if (serifFonts.includes(family)) return 'serif'
    return 'sans-serif'
  }

  const loadFont = useCallback((font: GoogleFont) => {
    if (loadedFonts.has(font.family)) return

    // Load font via Google Fonts CSS
    const link = document.createElement('link')
    link.href = `https://fonts.googleapis.com/css2?family=${font.family.replace(/\s+/g, '+')}:wght@400;700&display=swap`
    link.rel = 'stylesheet'
    document.head.appendChild(link)

    setLoadedFonts(prev => new Set(prev).add(font.family))
  }, [loadedFonts])

  const handleFontSelect = (font: GoogleFont) => {
    loadFont(font)
    onFontSelect?.(font.family)
  }

  const getCategoryCount = (cat: string) => {
    if (cat === 'all') return fonts.length
    return fonts.filter(f => f.category === cat).length
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fonts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="sans-serif" className="text-xs">
              Sans
            </TabsTrigger>
            <TabsTrigger value="serif" className="text-xs">
              Serif
            </TabsTrigger>
            <TabsTrigger value="display" className="text-xs">
              Display
            </TabsTrigger>
            <TabsTrigger value="handwriting" className="text-xs">
              Script
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Font List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-8 text-center">
            <div className="text-sm text-muted-foreground">Loading fonts...</div>
          </div>
        ) : filteredFonts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-sm text-muted-foreground">No fonts found</div>
            <div className="text-xs text-muted-foreground mt-1">
              Try a different search or category
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredFonts.map((font) => (
              <div
                key={font.family}
                onClick={() => handleFontSelect(font)}
                onMouseEnter={() => loadFont(font)}
                className={cn(
                  'p-3 rounded-md cursor-pointer hover:bg-accent transition-colors',
                  selectedFont === font.family && 'bg-accent'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">
                        {font.family}
                      </div>
                      {POPULAR_FONTS.includes(font.family) && (
                        <Badge variant="secondary" className="text-xs">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <div
                      className="text-lg mt-1 truncate"
                      style={{
                        fontFamily: loadedFonts.has(font.family) ? font.family : 'inherit'
                      }}
                    >
                      The quick brown fox jumps
                    </div>
                  </div>

                  {selectedFont === font.family && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {font.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {font.variants.length} weights
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer Info */}
      <div className="p-3 border-t bg-muted/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredFonts.length} fonts</span>
          <span>{loadedFonts.size} loaded</span>
        </div>
      </div>
    </div>
  )
}
