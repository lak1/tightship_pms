'use client'

import { useState } from 'react'

interface MenuItem {
  id: string
  name: string
  description?: string | null
  basePrice: number
  category?: {
    id: string
    name: string
  }
}

interface MenuTemplateProps {
  restaurantName: string
  items: MenuItem[]
  customization: {
    primaryColor: string
    secondaryColor: string
    fontFamily: string
    logoUrl?: string
  }
}

export default function MenuTemplate({ restaurantName, items, customization }: MenuTemplateProps) {
  const { primaryColor, secondaryColor, fontFamily, logoUrl } = customization

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const categoryName = item.category?.name || 'Other Items'
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)

  return (
    <div
      className="mx-auto max-w-4xl bg-white p-12 shadow-lg"
      style={{ fontFamily }}
      id="menu-preview"
    >
      {/* Header */}
      <div className="mb-12 text-center">
        {logoUrl && (
          <div className="mb-6 flex justify-center">
            <img src={logoUrl} alt={restaurantName} className="h-24 w-auto" />
          </div>
        )}
        <h1
          className="text-5xl font-bold uppercase tracking-wide"
          style={{ color: primaryColor }}
        >
          {restaurantName}
        </h1>
        <div
          className="mx-auto mt-4 h-1 w-32"
          style={{ backgroundColor: secondaryColor }}
        ></div>
      </div>

      {/* Menu Categories */}
      {Object.entries(itemsByCategory).map(([categoryName, categoryItems]) => (
        <div key={categoryName} className="mb-12">
          {/* Category Header */}
          <div className="mb-6">
            <h2
              className="text-3xl font-semibold"
              style={{ color: primaryColor }}
            >
              {categoryName}
            </h2>
            <div
              className="mt-2 h-px w-full"
              style={{ backgroundColor: secondaryColor + '40' }}
            ></div>
          </div>

          {/* Menu Items */}
          <div className="space-y-6">
            {categoryItems.map(item => (
              <div key={item.id} className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <h3 className="text-xl font-medium text-gray-900">{item.name}</h3>
                  {item.description && (
                    <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                  )}
                </div>
                <div
                  className="flex-shrink-0 text-xl font-bold"
                  style={{ color: secondaryColor }}
                >
                  £{item.basePrice.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div className="mt-12 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
        <p>Thank you for dining with us!</p>
      </div>
    </div>
  )
}
