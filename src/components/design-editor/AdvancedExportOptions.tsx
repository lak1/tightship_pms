'use client'

import { useState } from 'react'
import * as fabric from 'fabric'
import { jsPDF } from 'jspdf'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, FileImage, FileText } from 'lucide-react'

interface AdvancedExportOptionsProps {
  canvas: fabric.Canvas | null
  isOpen: boolean
  onClose: () => void
}

type ExportFormat = 'png' | 'jpg' | 'svg' | 'pdf'
type ExportQuality = 'low' | 'medium' | 'high' | 'print'

export default function AdvancedExportOptions({
  canvas,
  isOpen,
  onClose,
}: AdvancedExportOptionsProps) {
  const [format, setFormat] = useState<ExportFormat>('png')
  const [quality, setQuality] = useState<ExportQuality>('high')
  const [includeBleed, setIncludeBleed] = useState(false)
  const [transparent, setTransparent] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const qualityMultipliers = {
    low: 1,
    medium: 2,
    high: 3,
    print: 4, // 300 DPI equivalent
  }

  const handleExport = async () => {
    if (!canvas) return

    setIsExporting(true)

    try {
      switch (format) {
        case 'png':
        case 'jpg':
          await exportRasterImage()
          break
        case 'svg':
          await exportSVG()
          break
        case 'pdf':
          await exportPDF()
          break
      }

      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const exportRasterImage = async () => {
    if (!canvas) return

    const multiplier = qualityMultipliers[quality]
    const originalWidth = canvas.width!
    const originalHeight = canvas.height!

    // Calculate export dimensions
    let exportWidth = originalWidth * multiplier
    let exportHeight = originalHeight * multiplier

    // Add bleed if requested (3mm on each side)
    if (includeBleed) {
      const bleedPx = 35 * multiplier // 3mm at 300 DPI
      exportWidth += bleedPx * 2
      exportHeight += bleedPx * 2
    }

    // Export with high quality
    const dataURL = canvas.toDataURL({
      format: format === 'jpg' ? 'jpeg' : 'png',
      quality: 1,
      multiplier,
      enableRetinaScaling: false,
      withoutTransform: false,
    })

    // Download
    const link = document.createElement('a')
    link.download = `menu-design.${format}`
    link.href = dataURL
    link.click()
  }

  const exportSVG = async () => {
    if (!canvas) return

    const svgData = canvas.toSVG()

    // Create blob and download
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.download = 'menu-design.svg'
    link.href = url
    link.click()

    URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    if (!canvas) return

    const width = canvas.width!
    const height = canvas.height!

    // Convert pixels to mm (assuming 96 DPI)
    const widthMM = (width * 25.4) / 96
    const heightMM = (height * 25.4) / 96

    // Create PDF with custom size
    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [widthMM, heightMM],
    })

    // Export canvas as high-res image
    const imgData = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 3, // High quality for PDF
      enableRetinaScaling: false,
    })

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 0, 0, widthMM, heightMM)

    // Add bleed marks if requested
    if (includeBleed) {
      const bleedMM = 3
      pdf.setDrawColor(0, 0, 0)
      pdf.setLineWidth(0.1)

      // Corner marks
      const markLength = 5
      // Top-left
      pdf.line(0, -bleedMM, markLength, -bleedMM)
      pdf.line(-bleedMM, 0, -bleedMM, markLength)
      // Top-right
      pdf.line(widthMM - markLength, -bleedMM, widthMM, -bleedMM)
      pdf.line(widthMM + bleedMM, 0, widthMM + bleedMM, markLength)
      // Bottom-left
      pdf.line(0, heightMM + bleedMM, markLength, heightMM + bleedMM)
      pdf.line(-bleedMM, heightMM - markLength, -bleedMM, heightMM)
      // Bottom-right
      pdf.line(widthMM - markLength, heightMM + bleedMM, widthMM, heightMM + bleedMM)
      pdf.line(widthMM + bleedMM, heightMM - markLength, widthMM + bleedMM, heightMM)
    }

    // Download PDF
    pdf.save('menu-design.pdf')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Advanced Export Options
          </DialogTitle>
          <DialogDescription>
            Choose format, quality, and additional export options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="png" id="png" />
                <Label htmlFor="png" className="flex items-center gap-2 font-normal">
                  <FileImage className="h-4 w-4" />
                  PNG - Best for digital use with transparency
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="jpg" id="jpg" />
                <Label htmlFor="jpg" className="flex items-center gap-2 font-normal">
                  <FileImage className="h-4 w-4" />
                  JPG - Smaller file size, no transparency
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="svg" id="svg" />
                <Label htmlFor="svg" className="flex items-center gap-2 font-normal">
                  <FileImage className="h-4 w-4" />
                  SVG - Scalable vector format
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 font-normal">
                  <FileText className="h-4 w-4" />
                  PDF - Print-ready document
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Quality Selection (for raster formats) */}
          {(format === 'png' || format === 'jpg') && (
            <div className="space-y-3">
              <Label>Export Quality</Label>
              <RadioGroup value={quality} onValueChange={(v) => setQuality(v as ExportQuality)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="low" />
                  <Label htmlFor="low" className="font-normal">
                    Low (1x) - Fast, small file
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="font-normal">
                    Medium (2x) - Balanced
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="high" />
                  <Label htmlFor="high" className="font-normal">
                    High (3x) - Best for screens
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="print" id="print" />
                  <Label htmlFor="print" className="font-normal">
                    Print (4x) - 300 DPI equivalent
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Additional Options */}
          <div className="space-y-3">
            <Label>Additional Options</Label>

            {format === 'png' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="transparent"
                  checked={transparent}
                  onCheckedChange={(checked) => setTransparent(checked as boolean)}
                />
                <Label htmlFor="transparent" className="font-normal">
                  Transparent background
                </Label>
              </div>
            )}

            {(format === 'pdf' || quality === 'print') && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bleed"
                  checked={includeBleed}
                  onCheckedChange={(checked) => setIncludeBleed(checked as boolean)}
                />
                <Label htmlFor="bleed" className="font-normal">
                  Include bleed marks (3mm)
                </Label>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
