'use client'

import { useState, useEffect } from 'react'
import * as fabric from 'fabric'
import { Search, Download, ExternalLink, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface UnsplashPhoto {
  id: string
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  user: {
    name: string
    username: string
    links: {
      html: string
    }
  }
  alt_description: string | null
  description: string | null
  width: number
  height: number
}

interface StockPhotoPanelProps {
  canvas: fabric.Canvas | null
  onPhotoAdded?: (image: fabric.Image) => void
}

const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || 'demo'

// Popular food-related search terms
const POPULAR_SEARCHES = [
  'restaurant',
  'food',
  'menu',
  'dining',
  'coffee',
  'wine',
  'pizza',
  'burger',
  'salad',
  'dessert',
  'chef',
  'kitchen'
]

export default function StockPhotoPanel({ canvas, onPhotoAdded }: StockPhotoPanelProps) {
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([])
  const [searchQuery, setSearchQuery] = useState('restaurant food')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    searchPhotos(searchQuery, 1)
  }, [])

  const searchPhotos = async (query: string, pageNum: number = 1) => {
    setLoading(true)
    setError(null)

    try {
      // In production, you'd use the actual Unsplash API
      // For demo purposes, we'll use placeholder images
      if (UNSPLASH_ACCESS_KEY === 'demo') {
        // Generate placeholder photos
        const demoPhotos: UnsplashPhoto[] = Array.from({ length: 12 }, (_, i) => ({
          id: `demo-${pageNum}-${i}`,
          urls: {
            raw: `https://picsum.photos/seed/${query}-${pageNum}-${i}/1200/800`,
            full: `https://picsum.photos/seed/${query}-${pageNum}-${i}/1200/800`,
            regular: `https://picsum.photos/seed/${query}-${pageNum}-${i}/800/600`,
            small: `https://picsum.photos/seed/${query}-${pageNum}-${i}/400/300`,
            thumb: `https://picsum.photos/seed/${query}-${pageNum}-${i}/200/150`,
          },
          user: {
            name: 'Demo User',
            username: 'demouser',
            links: {
              html: 'https://unsplash.com'
            }
          },
          alt_description: `${query} photo`,
          description: `High quality ${query} image`,
          width: 1200,
          height: 800
        }))

        setPhotos(pageNum === 1 ? demoPhotos : [...photos, ...demoPhotos])
        setPage(pageNum)
        setLoading(false)
        return
      }

      // Real Unsplash API call
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${pageNum}&per_page=12&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch photos from Unsplash')
      }

      const data = await response.json()
      setPhotos(pageNum === 1 ? data.results : [...photos, ...data.results])
      setPage(pageNum)
    } catch (err) {
      console.error('Error fetching photos:', err)
      setError('Failed to load photos. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    searchPhotos(searchQuery, 1)
  }

  const handleQuickSearch = (term: string) => {
    setSearchQuery(term)
    searchPhotos(term, 1)
  }

  const loadMore = () => {
    searchPhotos(searchQuery, page + 1)
  }

  const addPhotoToCanvas = async (photo: UnsplashPhoto) => {
    if (!canvas) return

    try {
      // Use regular size for better quality
      const imgUrl = photo.urls.regular

      fabric.Image.fromURL(imgUrl, (img) => {
        // Scale image to fit canvas
        const maxWidth = canvas.getWidth() * 0.6
        const maxHeight = canvas.getHeight() * 0.6

        const scale = Math.min(
          maxWidth / (img.width || 1),
          maxHeight / (img.height || 1),
          1
        )

        img.set({
          left: 100,
          top: 100,
          scaleX: scale,
          scaleY: scale,
        })

        // Store source information in data
        img.set('data', {
          source: 'unsplash',
          photoId: photo.id,
          photographer: photo.user.name,
          photographerUrl: photo.user.links.html
        })

        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.requestRenderAll()

        onPhotoAdded?.(img)
      }, { crossOrigin: 'anonymous' })

      // In production, you should also trigger a download tracking event
      // to comply with Unsplash API guidelines
      if (UNSPLASH_ACCESS_KEY !== 'demo') {
        fetch(`https://api.unsplash.com/photos/${photo.id}/download`, {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
          }
        }).catch(console.error)
      }
    } catch (err) {
      console.error('Error adding photo:', err)
      setError('Failed to add photo. Please try again.')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <h3 className="font-semibold text-sm">Stock Photos</h3>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search photos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={loading || !searchQuery.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </form>

        {/* Quick Search Tags */}
        <div className="flex flex-wrap gap-1">
          {POPULAR_SEARCHES.slice(0, 6).map(term => (
            <Badge
              key={term}
              variant="outline"
              className="cursor-pointer hover:bg-accent text-xs"
              onClick={() => handleQuickSearch(term)}
            >
              {term}
            </Badge>
          ))}
        </div>

        {UNSPLASH_ACCESS_KEY === 'demo' && (
          <p className="text-xs text-muted-foreground">
            Demo mode: Using placeholder images. Add NEXT_PUBLIC_UNSPLASH_ACCESS_KEY to .env for real photos.
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border-b">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Photos Grid */}
      <ScrollArea className="flex-1">
        {loading && photos.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">
              No photos found. Try a different search term.
            </p>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-[4/3] rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => addPhotoToCanvas(photo)}
                >
                  <img
                    src={photo.urls.thumb}
                    alt={photo.alt_description || 'Stock photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <Button size="sm" variant="secondary">
                      <Download className="h-3 w-3 mr-2" />
                      Add to Canvas
                    </Button>

                    <a
                      href={photo.user.links.html}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Photo by {photo.user.name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Photo Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">
                      {photo.alt_description || photo.description || 'Untitled'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {photos.length > 0 && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {UNSPLASH_ACCESS_KEY !== 'demo' && (
        <div className="p-3 border-t bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            Photos from{' '}
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Unsplash
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
