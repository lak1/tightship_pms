'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Download, Printer, Eye, EyeOff, Settings, Image, FileImage } from 'lucide-react'
import { STANDARD_ALLERGENS } from '@/lib/constants/allergens'

export default function AllergenMatrixPage() {
  const { data: session } = useSession()
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [includeCategories, setIncludeCategories] = useState(true)
  const [includeMayContain, setIncludeMayContain] = useState(true)
  const [selectAll, setSelectAll] = useState(true)
  const [printScale, setPrintScale] = useState<'fit-page' | 'normal' | 'small'>('fit-page')
  const [exportOrientation, setExportOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const [customDisclaimers, setCustomDisclaimers] = useState({
    cooking: 'All food is cooked in the same oil.',
    crossContamination: 'Allergens in brackets may be present in the food.',
    contact: 'For further information please speak to a member of staff.'
  })
  const [showSettings, setShowSettings] = useState(false)
  const matrixRef = useRef<HTMLDivElement>(null)

  const { data: restaurants } = trpc.restaurant.list.useQuery(undefined, {
    enabled: !!session
  })

  const { data: products } = trpc.product.list.useQuery(
    { 
      restaurantId: selectedRestaurantId,
      limit: 1000 
    },
    { enabled: !!selectedRestaurantId }
  )

  const { data: matrixData, refetch: generateMatrix } = trpc.product.generateAllergenMatrix.useQuery(
    {
      restaurantId: selectedRestaurantId,
      productIds: selectAll ? undefined : selectedProducts,
      includeCategories,
      includeMayContain,
    },
    {
      enabled: false // Manual trigger only
    }
  )

  const handleRestaurantChange = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId)
    setSelectedProducts([])
    setSelectAll(true)
  }

  const handleProductSelection = (productId: string, selected: boolean) => {
    if (selected) {
      setSelectedProducts(prev => [...prev, productId])
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId))
    }
    setSelectAll(false)
  }

  const handleSelectAllToggle = () => {
    if (selectAll) {
      setSelectAll(false)
      setSelectedProducts([])
    } else {
      setSelectAll(true)
      setSelectedProducts(products?.products.map(p => p.id) || [])
    }
  }

  const handleGenerateMatrix = () => {
    if (selectedRestaurantId) {
      generateMatrix()
    }
  }

  const handlePrint = () => {
    if (!matrixData) return

    // Generate SVG content for printing using same logic as SVG export
    const productCount = matrixData.products.length
    const scale = 1
    const margin = 30 * scale
    const titleHeight = 30 * scale
    const headerHeight = 40 * scale
    const rowHeight = 12 * scale
    const footerHeight = 100 * scale

    // Use export orientation for sizing
    let productNameWidth, categoryWidth, allergenColWidth, canvasWidth, canvasHeight

    if (exportOrientation === 'portrait') {
      productNameWidth = 400
      categoryWidth = 300
      allergenColWidth = 90
      canvasWidth = margin * 2 + productNameWidth + categoryWidth + (allergenColWidth * STANDARD_ALLERGENS.length)
      canvasHeight = margin * 2 + titleHeight + 20 * scale + headerHeight + (productCount * rowHeight) + footerHeight
    } else {
      productNameWidth = 600
      categoryWidth = 400
      allergenColWidth = 110
      canvasWidth = margin * 2 + productNameWidth + categoryWidth + (allergenColWidth * STANDARD_ALLERGENS.length)
      canvasHeight = margin * 2 + titleHeight + 20 * scale + headerHeight + (productCount * rowHeight) + footerHeight
    }

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" preserveAspectRatio="none">
  <style>
    .title { font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; text-anchor: middle; }
    .header { font-family: Arial, sans-serif; font-size: 8px; font-weight: bold; text-anchor: middle; }
    .cell-text { font-family: Arial, sans-serif; font-size: 12px; text-anchor: start; }
    .allergen-text { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-anchor: middle; }
    .footer-text { font-family: Arial, sans-serif; font-size: 12px; }
    .contains { fill: #22c55e; }
    .may-contain { fill: #f59e0b; }
  </style>

  <!-- Title -->
  <text x="${canvasWidth/2}" y="${margin + titleHeight}" class="title">ALLERGEN INFORMATION</text>

  ${generateSVGContent(canvasWidth, canvasHeight, margin, titleHeight, headerHeight, rowHeight, productNameWidth, categoryWidth, allergenColWidth)}
</svg>`

    // Create a proper HTML document for printing with embedded SVG that fills the page
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Allergen Matrix</title>
  <style>
    @page {
      margin: 0;
      size: auto;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    svg {
      width: 100vw;
      height: 100vh;
      display: block;
    }
    @media print {
      html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        margin: 0;
        padding: 0;
      }
      svg {
        width: 100%;
        height: 100%;
      }
    }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`

    // Store original title
    const originalTitle = document.title

    // Create a hidden overlay with the SVG for printing
    const printOverlay = document.createElement('div')
    printOverlay.id = 'print-overlay'
    printOverlay.innerHTML = svgContent

    // Add print-specific styles
    const printStyle = document.createElement('style')
    printStyle.id = 'print-styles'
    printStyle.innerHTML = `
      #print-overlay {
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 100vw;
        height: 100vh;
        z-index: -1;
        pointer-events: none;
      }

      @media print {
        body > *:not(#print-overlay) {
          display: none !important;
        }

        #print-overlay {
          position: static !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 9999 !important;
          display: block !important;
          width: 100% !important;
          height: 100% !important;
        }

        #print-overlay svg {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          object-fit: fill !important;
        }

        @page {
          margin: 0;
          size: auto;
        }

        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `

    // Add elements to DOM
    document.head.appendChild(printStyle)
    document.body.appendChild(printOverlay)

    // Set print title
    document.title = 'Allergen Matrix'

    // Trigger print
    setTimeout(() => {
      window.print()

      // Clean up after print (when print dialog closes)
      const cleanup = () => {
        const overlay = document.getElementById('print-overlay')
        const styles = document.getElementById('print-styles')
        if (overlay) document.body.removeChild(overlay)
        if (styles) document.head.removeChild(styles)
        document.title = originalTitle
      }

      // Set up cleanup on various events
      window.addEventListener('afterprint', cleanup, { once: true })

      // Fallback cleanup after delay
      setTimeout(cleanup, 5000)
    }, 100)
  }

  const exportToCsv = () => {
    if (!matrixData) return

    const csvRows = []
    
    // Headers
    const headers = ['Product', 'Category', ...STANDARD_ALLERGENS]
    csvRows.push(headers.join(','))

    // Data rows
    matrixData.products.forEach(product => {
      const row = [
        `"${product.productName}"`,
        `"${product.category}"`,
        ...STANDARD_ALLERGENS.map(allergen => `"${product[allergen] || ''}"`)
      ]
      csvRows.push(row.join(','))
    })

    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `allergen-matrix-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToSVG = () => {
    if (!matrixRef.current || !matrixData) return

    // Use same dimensions logic as PNG export
    const productCount = matrixData.products.length
    const scale = 1 // SVG uses smaller scale
    const margin = 30 * scale
    const titleHeight = 30 * scale
    const headerHeight = 40 * scale
    const rowHeight = 12 * scale
    const footerHeight = 100 * scale
    
    // Same column calculations as PNG with orientation support
    let productNameWidth, categoryWidth, allergenColWidth, canvasWidth, canvasHeight
    
    if (exportOrientation === 'portrait') {
      productNameWidth = 400
      categoryWidth = 300
      allergenColWidth = 90
      canvasWidth = margin * 2 + productNameWidth + categoryWidth + (allergenColWidth * STANDARD_ALLERGENS.length)
      canvasHeight = margin * 2 + titleHeight + 20 * scale + headerHeight + (productCount * rowHeight) + footerHeight
    } else {
      productNameWidth = 600
      categoryWidth = 400
      allergenColWidth = 110
      canvasWidth = margin * 2 + productNameWidth + categoryWidth + (allergenColWidth * STANDARD_ALLERGENS.length)
      canvasHeight = margin * 2 + titleHeight + 20 * scale + headerHeight + (productCount * rowHeight) + footerHeight
    }
    
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <style>
    .title { font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; text-anchor: middle; }
    .header { font-family: Arial, sans-serif; font-size: 8px; font-weight: bold; text-anchor: middle; }
    .cell-text { font-family: Arial, sans-serif; font-size: 12px; text-anchor: start; }
    .allergen-text { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-anchor: middle; }
    .footer-text { font-family: Arial, sans-serif; font-size: 12px; }
    .contains { fill: #22c55e; }
    .may-contain { fill: #f59e0b; }
  </style>
  
  <!-- Title -->
  <text x="${canvasWidth/2}" y="${margin + titleHeight}" class="title">ALLERGEN INFORMATION</text>
  
  ${generateSVGContent(canvasWidth, canvasHeight, margin, titleHeight, headerHeight, rowHeight, productNameWidth, categoryWidth, allergenColWidth)}
</svg>`

    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `allergen-matrix-large-format-${new Date().toISOString().split('T')[0]}.svg`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const escapeXML = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  const generateSVGContent = (canvasWidth: number, canvasHeight: number, margin: number, titleHeight: number, headerHeight: number, rowHeight: number, productNameWidth: number, categoryWidth: number, allergenColWidth: number) => {
    if (!matrixData) return ''
    
    let svg = ''
    let currentY = margin + titleHeight + 20
    
    // Allergen abbreviations (same as PNG)
    const allergenAbbreviations = [
      'Gluten', 'Crust', 'Eggs', 'Fish', 'Pnut', 'Soy', 'Milk', 'Nuts', 
      'Celery', 'Must', 'Sesame', 'SO2', 'Lupin', 'Mollusk'
    ]
    
    // Header row
    svg += `<rect x="${margin}" y="${currentY}" width="${productNameWidth}" height="${headerHeight}" fill="#f5f5f5" stroke="#000" stroke-width="1"/>`
    svg += `<text x="${margin + 5}" y="${currentY + headerHeight/2 + 6}" class="cell-text">Food</text>`
    
    svg += `<rect x="${margin + productNameWidth}" y="${currentY}" width="${categoryWidth}" height="${headerHeight}" fill="#f5f5f5" stroke="#000" stroke-width="1"/>`
    svg += `<text x="${margin + productNameWidth + 5}" y="${currentY + headerHeight/2 + 6}" class="cell-text">Category</text>`
    
    // Allergen headers
    STANDARD_ALLERGENS.forEach((allergen, index) => {
      const x = margin + productNameWidth + categoryWidth + (index * allergenColWidth)
      svg += `<rect x="${x}" y="${currentY}" width="${allergenColWidth}" height="${headerHeight}" fill="#f5f5f5" stroke="#000" stroke-width="1"/>`
      svg += `<text x="${x + allergenColWidth/2}" y="${currentY + headerHeight/2 + 3}" class="header">${allergenAbbreviations[index]}</text>`
    })
    
    currentY += headerHeight
    
    // Data rows
    matrixData.products.forEach((product, rowIndex) => {
      const isEven = rowIndex % 2 === 0
      
      // Product name
      svg += `<rect x="${margin}" y="${currentY}" width="${productNameWidth}" height="${rowHeight}" fill="${isEven ? 'white' : '#f9f9f9'}" stroke="#ccc" stroke-width="0.5"/>`
      svg += `<text x="${margin + 3}" y="${currentY + rowHeight/2 + 4}" class="cell-text">${escapeXML(product.productName.substring(0, 30))}</text>`
      
      // Category
      svg += `<rect x="${margin + productNameWidth}" y="${currentY}" width="${categoryWidth}" height="${rowHeight}" fill="${isEven ? 'white' : '#f9f9f9'}" stroke="#ccc" stroke-width="0.5"/>`
      svg += `<text x="${margin + productNameWidth + 3}" y="${currentY + rowHeight/2 + 4}" class="cell-text">${escapeXML(product.category.substring(0, 20))}</text>`
      
      // Allergen cells
      STANDARD_ALLERGENS.forEach((allergen, colIndex) => {
        const x = margin + productNameWidth + categoryWidth + (colIndex * allergenColWidth)
        const value = product[allergen] || ''
        
        svg += `<rect x="${x}" y="${currentY}" width="${allergenColWidth}" height="${rowHeight}" fill="${isEven ? 'white' : '#f9f9f9'}" stroke="#ccc" stroke-width="0.5"/>`
        
        if (value) {
          const className = value.includes('(✓)') ? 'allergen-text may-contain' : 'allergen-text contains'
          svg += `<text x="${x + allergenColWidth/2}" y="${currentY + rowHeight/2 + 4}" class="${className}">${escapeXML(value)}</text>`
        }
      })
      
      currentY += rowHeight
    })
    
    // Footer
    const footerStartY = currentY + 30
    
    // Disclaimers
    let yPos = footerStartY
    if (customDisclaimers.cooking) {
      svg += `<text x="${margin}" y="${yPos}" class="footer-text">${escapeXML(customDisclaimers.cooking.substring(0, 50))}</text>`
      yPos += 24
    }
    if (customDisclaimers.crossContamination) {
      svg += `<text x="${margin}" y="${yPos}" class="footer-text">${escapeXML(customDisclaimers.crossContamination.substring(0, 50))}</text>`
      yPos += 24
    }
    if (customDisclaimers.contact) {
      svg += `<text x="${margin}" y="${yPos}" class="footer-text">${escapeXML(customDisclaimers.contact.substring(0, 50))}</text>`
    }
    
    // Legend
    const legendX = canvasWidth / 2 + 50
    let legendY = footerStartY
    
    svg += `<text x="${legendX}" y="${legendY}" class="footer-text" font-weight="bold">Legend:</text>`
    legendY += 22
    svg += `<text x="${legendX}" y="${legendY}" class="footer-text contains">✓</text>`
    svg += `<text x="${legendX + 30}" y="${legendY}" class="footer-text"> = Contains allergen (legally declared)</text>`
    legendY += 20
    svg += `<text x="${legendX}" y="${legendY}" class="footer-text may-contain">(✓)</text>`
    svg += `<text x="${legendX + 30}" y="${legendY}" class="footer-text"> = May contain allergen (cross-contamination risk)</text>`
    legendY += 20
    svg += `<text x="${legendX}" y="${legendY}" class="footer-text contains">✓ (✓)</text>`
    svg += `<text x="${legendX + 50}" y="${legendY}" class="footer-text"> = Contains and may contain allergen</text>`
    
    return svg
  }

  const exportToHighResPNG = async () => {
    if (!matrixRef.current) return

    // Calculate required dimensions based on content and orientation
    const productCount = matrixData?.products.length || 0 // No limit - user can include all products they want
    const scale = 2
    const margin = 30 * scale
    const titleHeight = 30 * scale
    const headerHeight = 40 * scale
    const rowHeight = 12 * scale // Even smaller row height
    const footerHeight = 100 * scale // Reduced since footer is now closer to table
    
    // Column width calculations based on orientation
    let productNameWidth, categoryWidth, allergenColWidth, canvasWidth, canvasHeight
    
    if (exportOrientation === 'portrait') {
      // Portrait: Dynamic sizing based on content
      productNameWidth = 400
      categoryWidth = 300
      allergenColWidth = 90
      canvasWidth = margin * 2 + productNameWidth + categoryWidth + (allergenColWidth * STANDARD_ALLERGENS.length)
      canvasHeight = margin * 2 + titleHeight + 20 * scale + headerHeight + (productCount * rowHeight) + footerHeight
    } else {
      // Landscape: Dynamic sizing based on content  
      productNameWidth = 600
      categoryWidth = 400
      allergenColWidth = 110
      canvasWidth = margin * 2 + productNameWidth + categoryWidth + (allergenColWidth * STANDARD_ALLERGENS.length)
      canvasHeight = margin * 2 + titleHeight + 20 * scale + headerHeight + (productCount * rowHeight) + footerHeight
    }
    
    console.log(`${exportOrientation} canvas: ${canvasWidth} x ${canvasHeight} (${canvasWidth > canvasHeight ? 'landscape' : 'portrait'})`)
    
    // Create a high-resolution canvas with proper dimensions
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    
    if (!ctx) return

    // White background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw the matrix content at high resolution
    await drawMatrixOnCanvas(ctx, canvas.width, canvas.height, {
      scale,
      margin,
      titleHeight,
      headerHeight,
      rowHeight,
      footerHeight,
      productNameWidth,
      categoryWidth,
      allergenColWidth,
      orientation: exportOrientation
    })
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `allergen-matrix-high-res-${new Date().toISOString().split('T')[0]}.png`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    }, 'image/png')
  }

  const drawMatrixOnCanvas = async (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, params: any) => {
    if (!matrixData) return
    
    const { scale, margin, titleHeight, headerHeight, rowHeight, footerHeight, productNameWidth, categoryWidth, allergenColWidth, orientation } = params
    
    ctx.fillStyle = '#000'
    
    // Title
    ctx.font = `bold ${24 * scale}px Arial`
    ctx.textAlign = 'center'
    ctx.fillText('ALLERGEN INFORMATION', canvasWidth / 2, margin + titleHeight)
    
    // Table start position
    let currentY = margin + titleHeight + 20 * scale
    
    // Draw table headers
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(margin, currentY, productNameWidth + categoryWidth + (allergenColWidth * STANDARD_ALLERGENS.length), headerHeight)
    
    // Header borders and text
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1 * scale
    ctx.strokeRect(margin, currentY, productNameWidth + categoryWidth + (allergenColWidth * STANDARD_ALLERGENS.length), headerHeight)
    
    // Individual cell borders for headers
    ctx.strokeRect(margin, currentY, productNameWidth, headerHeight) // Food column
    ctx.strokeRect(margin + productNameWidth, currentY, categoryWidth, headerHeight) // Category column
    
    // Column headers
    ctx.fillStyle = '#000'
    ctx.font = `bold ${16 * scale}px Arial`
    ctx.textAlign = 'left'
    ctx.fillText('Food', margin + 5 * scale, currentY + headerHeight / 2 + 6 * scale)
    ctx.fillText('Category', margin + productNameWidth + 5 * scale, currentY + headerHeight / 2 + 6 * scale)
    
    // Allergen headers (horizontal, abbreviated)
    ctx.font = `bold ${8 * scale}px Arial`
    ctx.textAlign = 'center'
    const allergenAbbreviations = [
      'Gluten', 'Crust', 'Eggs', 'Fish', 'Pnut', 'Soy', 'Milk', 'Nuts', 
      'Celery', 'Must', 'Sesame', 'SO2', 'Lupin', 'Mollusk'
    ]
    
    STANDARD_ALLERGENS.forEach((allergen, index) => {
      const x = margin + productNameWidth + categoryWidth + (index * allergenColWidth)
      const centerX = x + (allergenColWidth / 2)
      
      // Cell border
      ctx.strokeRect(x, currentY, allergenColWidth, headerHeight)
      
      // Header text (horizontal, not rotated)
      ctx.fillText(allergenAbbreviations[index] || allergen.substring(0, 6), centerX, currentY + headerHeight / 2 + 3 * scale)
    })
    
    currentY += headerHeight
    
    // Draw data rows
    matrixData.products.forEach((product, rowIndex) => {
      const isEvenRow = rowIndex % 2 === 0
      
      // Row background
      if (!isEvenRow) {
        ctx.fillStyle = '#f9f9f9'
        ctx.fillRect(margin, currentY, productNameWidth + categoryWidth + (allergenColWidth * STANDARD_ALLERGENS.length), rowHeight)
      }
      
      // Individual cell borders and content
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 0.5 * scale
      
      // Product name cell
      ctx.strokeRect(margin, currentY, productNameWidth, rowHeight)
      ctx.fillStyle = '#000'
      ctx.font = `${12 * scale}px Arial`
      ctx.textAlign = 'left'
      ctx.fillText(product.productName.substring(0, 30), margin + 3 * scale, currentY + rowHeight / 2 + 4 * scale)
      
      // Category cell
      ctx.strokeRect(margin + productNameWidth, currentY, categoryWidth, rowHeight)
      ctx.fillText(product.category.substring(0, 20), margin + productNameWidth + 3 * scale, currentY + rowHeight / 2 + 4 * scale)
      
      // Allergen cells
      STANDARD_ALLERGENS.forEach((allergen, colIndex) => {
        const x = margin + productNameWidth + categoryWidth + (colIndex * allergenColWidth)
        const centerX = x + (allergenColWidth / 2)
        const centerY = currentY + rowHeight / 2 + 4 * scale
        
        // Cell border
        ctx.strokeRect(x, currentY, allergenColWidth, rowHeight)
        
        // Allergen marker
        const value = product[allergen] || ''
        if (value) {
          ctx.fillStyle = value.includes('(✓)') ? '#f59e0b' : '#22c55e'
          ctx.font = `bold ${16 * scale}px Arial`
          ctx.textAlign = 'center'
          ctx.fillText(value, centerX, centerY)
          ctx.fillStyle = '#000' // Reset color
        }
      })
      
      currentY += rowHeight
    })
    
    // Footer section - ensure it fits within canvas bounds
    const maxFooterY = canvasHeight - footerHeight
    currentY = Math.min(currentY + 20 * scale, maxFooterY)
    
    // Footer content positioned close to table end
    const footerStartY = currentY + 30 * scale // Much closer to table
    
    // Left side - Disclaimers (simplified, single line each)
    ctx.fillStyle = '#000'
    ctx.font = `${12 * scale}px Arial`
    ctx.textAlign = 'left'
    
    let yPos = footerStartY
    
    if (customDisclaimers.cooking) {
      ctx.fillText(customDisclaimers.cooking.substring(0, 50), margin, yPos)
      yPos += 24 * scale
    }
    if (customDisclaimers.crossContamination) {
      ctx.fillText(customDisclaimers.crossContamination.substring(0, 50), margin, yPos)
      yPos += 24 * scale
    }
    if (customDisclaimers.contact) {
      ctx.fillText(customDisclaimers.contact.substring(0, 50), margin, yPos)
      yPos += 24 * scale
    }
    
    // Right side - Legend (position independently from disclaimers)
    const legendX = canvasWidth / 2 + 50 * scale
    let legendY = footerStartY
    
    ctx.font = `bold ${16 * scale}px Arial` // Smaller font
    ctx.fillText('Legend:', legendX, legendY)
    legendY += 22 * scale
    
    ctx.font = `${14 * scale}px Arial` // Smaller font
    ctx.fillStyle = '#22c55e'
    ctx.fillText('✓', legendX, legendY)
    ctx.fillStyle = '#000'
    ctx.fillText(' = Contains allergen (legally declared)', legendX + 30 * scale, legendY)
    legendY += 20 * scale
    
    ctx.fillStyle = '#f59e0b'
    ctx.fillText('(✓)', legendX, legendY)
    ctx.fillStyle = '#000'
    ctx.fillText(' = May contain allergen (cross-contamination risk)', legendX + 30 * scale, legendY)
    legendY += 20 * scale
    
    ctx.fillStyle = '#22c55e'
    ctx.fillText('✓ (✓)', legendX, legendY)
    ctx.fillStyle = '#000'
    ctx.fillText(' = Contains and may contain allergen', legendX + 50 * scale, legendY)
    
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Please sign in to access this page.</div>
      </div>
    )
  }

  return (
    <DashboardLayout
      title="Allergen Matrix Generator"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Allergen Matrix' }
      ]}
    >
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Configuration Panel */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Matrix Configuration</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Restaurant Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Restaurant
              </label>
              <select
                value={selectedRestaurantId}
                onChange={(e) => handleRestaurantChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a restaurant</option>
                {restaurants?.map(restaurant => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Matrix Options
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeCategories}
                    onChange={(e) => setIncludeCategories(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Group by categories</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeMayContain}
                    onChange={(e) => setIncludeMayContain(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include "may contain" allergens</span>
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <button
                onClick={handleGenerateMatrix}
                disabled={!selectedRestaurantId}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Matrix
              </button>
            </div>
          </div>
        </div>

        {/* Product Selection */}
        {products && products.products.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Product Selection</h3>
              <button
                onClick={handleSelectAllToggle}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {selectAll ? (
                  <>
                    <EyeOff className="mr-1 h-4 w-4" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Eye className="mr-1 h-4 w-4" />
                    Select All
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
              {products.products.map(product => (
                <label key={product.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectAll || selectedProducts.includes(product.id)}
                    onChange={(e) => handleProductSelection(product.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{product.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Matrix Display */}
        {matrixData && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Allergen Matrix ({matrixData.metadata.totalProducts} products)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md ${showSettings
                    ? 'border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </button>
                
                {/* Export Options */}
                <div className="relative group">
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                    <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={exportToCsv}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Download className="mr-3 h-4 w-4" />
                        <div className="text-left">
                          <div className="font-medium">CSV Data</div>
                          <div className="text-xs text-gray-500">Spreadsheet format</div>
                        </div>
                      </button>
                      <button
                        onClick={exportToSVG}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FileImage className="mr-3 h-4 w-4" />
                        <div className="text-left">
                          <div className="font-medium">SVG Vector</div>
                          <div className="text-xs text-gray-500">Perfect for large format printing (A0-A2)</div>
                        </div>
                      </button>
                      <button
                        onClick={exportToHighResPNG}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Image className="mr-3 h-4 w-4" />
                        <div className="text-left">
                          <div className="font-medium">High-Res PNG</div>
                          <div className="text-xs text-gray-500">300 DPI image for web/print</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Matrix
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Print & Display Settings</h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Print Scale Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Print Scale
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="printScale"
                          value="fit-page"
                          checked={printScale === 'fit-page'}
                          onChange={(e) => setPrintScale(e.target.value as any)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Fit to page (small text, may be hard to read)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="printScale"
                          value="small"
                          checked={printScale === 'small'}
                          onChange={(e) => setPrintScale(e.target.value as any)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Small (good compromise)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="printScale"
                          value="normal"
                          checked={printScale === 'normal'}
                          onChange={(e) => setPrintScale(e.target.value as any)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Normal (readable but may span multiple pages)</span>
                      </label>
                    </div>
                  </div>

                  {/* Export Orientation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Export Orientation (PNG only)
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="exportOrientation"
                          value="landscape"
                          checked={exportOrientation === 'landscape'}
                          onChange={(e) => setExportOrientation(e.target.value as any)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Landscape (wider columns, easier to read)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="exportOrientation"
                          value="portrait"
                          checked={exportOrientation === 'portrait'}
                          onChange={(e) => setExportOrientation(e.target.value as any)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Portrait (narrow columns, fits more products)</span>
                      </label>
                    </div>
                  </div>

                  {/* Custom Disclaimers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Disclaimers
                    </label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Cooking Information</label>
                        <textarea
                          value={customDisclaimers.cooking}
                          onChange={(e) => setCustomDisclaimers(prev => ({ ...prev, cooking: e.target.value }))}
                          className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                          placeholder="e.g., All food is cooked in the same oil."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Cross-contamination Warning</label>
                        <textarea
                          value={customDisclaimers.crossContamination}
                          onChange={(e) => setCustomDisclaimers(prev => ({ ...prev, crossContamination: e.target.value }))}
                          className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                          placeholder="e.g., Allergens in brackets may be present in the food."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Contact Information</label>
                        <textarea
                          value={customDisclaimers.contact}
                          onChange={(e) => setCustomDisclaimers(prev => ({ ...prev, contact: e.target.value }))}
                          className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                          placeholder="e.g., For further information please speak to a member of staff."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={matrixRef} className="overflow-x-auto">
              <h1 className="text-xl font-bold text-center mb-4">ALLERGEN INFORMATION</h1>
              
              <table className="min-w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 bg-gray-50 text-left font-bold">
                      Food
                    </th>
                    {includeCategories && (
                      <th className="border border-gray-300 p-2 bg-gray-50 text-left font-bold">
                        Category
                      </th>
                    )}
                    {STANDARD_ALLERGENS.map(allergen => (
                      <th
                        key={allergen}
                        className="border border-gray-300 p-1 bg-gray-50 text-center font-bold min-w-[60px]"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                      >
                        {allergen.replace('Cereals containing ', '').replace('Sulphur dioxide and sulphites', 'Sulphites')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.products.map((product, index) => (
                    <tr key={product.productId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 p-2 text-left font-medium">
                        {product.productName}
                      </td>
                      {includeCategories && (
                        <td className="border border-gray-300 p-2 text-left text-gray-600">
                          {product.category}
                        </td>
                      )}
                      {STANDARD_ALLERGENS.map(allergen => {
                        const value = product[allergen] || ''
                        const className = value.includes('✓ (✓)')
                          ? 'text-green-600 font-bold'
                          : value.includes('(✓)')
                            ? 'text-yellow-600'
                            : value.includes('✓')
                              ? 'text-green-600 font-bold'
                              : 'text-gray-300'

                        return (
                          <td
                            key={allergen}
                            className={`border border-gray-300 p-1 text-center ${className}`}
                          >
                            {value}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 text-xs text-gray-600">
                {customDisclaimers.cooking && (
                  <p className="font-semibold mb-2">{customDisclaimers.cooking}</p>
                )}
                {customDisclaimers.crossContamination && (
                  <p className="mb-2">{customDisclaimers.crossContamination}</p>
                )}
                {customDisclaimers.contact && (
                  <p className="text-right italic">{customDisclaimers.contact}</p>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="font-semibold mb-2">Legend:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <p><span className="text-green-600 font-bold">✓</span> = Contains allergen (legally declared)</p>
                    <p><span className="text-yellow-600">(✓)</span> = May contain allergen (cross-contamination risk)</p>
                    <p><span className="text-green-600 font-bold">✓ (✓)</span> = Contains and may contain allergen</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}