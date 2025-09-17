'use client'

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'

interface Restaurant {
  id: string
  name: string
  menus?: Menu[]
}

interface Menu {
  id: string
  name: string
  restaurantId: string
}

interface RestaurantMenuContextType {
  // Current selections
  selectedRestaurant: Restaurant | null
  selectedMenu: Menu | null
  selectedRestaurantId: string | null
  selectedMenuId: string | null

  // Available options
  restaurants: Restaurant[]
  menus: Menu[]

  // Actions
  setSelectedRestaurant: (restaurant: Restaurant | null) => void
  setSelectedMenu: (menu: Menu | null) => void
  setSelectedRestaurantById: (restaurantId: string | null) => void
  setSelectedMenuById: (menuId: string | null) => void

  // State
  isLoading: boolean
  error: string | null
}

const RestaurantMenuContext = createContext<RestaurantMenuContextType | undefined>(undefined)

const STORAGE_KEYS = {
  RESTAURANT_ID: 'tightship_selected_restaurant_id',
  MENU_ID: 'tightship_selected_menu_id'
}

interface RestaurantMenuProviderProps {
  children: ReactNode
}

export function RestaurantMenuProvider({ children }: RestaurantMenuProviderProps) {
  const { data: session } = useSession()
  const [selectedRestaurantId, setSelectedRestaurantIdState] = useState<string | null>(null)
  const [selectedMenuId, setSelectedMenuIdState] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Fetch restaurants with their menus
  const { data: restaurantsData = [], isLoading: restaurantsLoading, error: restaurantsError } = trpc.restaurant.list.useQuery(
    undefined,
    { enabled: !!session }
  )

  // Extract restaurants and get menus for selected restaurant
  const restaurants = restaurantsData
  const menusData = selectedRestaurantId
    ? restaurants.find(r => r.id === selectedRestaurantId)?.menus || []
    : []

  // Load saved selections from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasInitialized) {
      const savedRestaurantId = localStorage.getItem(STORAGE_KEYS.RESTAURANT_ID)
      const savedMenuId = localStorage.getItem(STORAGE_KEYS.MENU_ID)

      setSelectedRestaurantIdState(savedRestaurantId)
      setSelectedMenuIdState(savedMenuId)
      setHasInitialized(true)
    }
  }, [hasInitialized])

  // Auto-select restaurant if only one exists and none is selected
  useEffect(() => {
    if (hasInitialized && restaurants.length > 0 && !selectedRestaurantId) {
      if (restaurants.length === 1) {
        const autoRestaurant = restaurants[0]
        setSelectedRestaurantIdState(autoRestaurant.id)
        localStorage.setItem(STORAGE_KEYS.RESTAURANT_ID, autoRestaurant.id)
      }
    }
  }, [hasInitialized, restaurants, selectedRestaurantId])

  // Auto-select menu if only one exists for selected restaurant and none is selected
  useEffect(() => {
    if (hasInitialized && selectedRestaurantId && menusData.length > 0 && !selectedMenuId) {
      if (menusData.length === 1) {
        const autoMenu = menusData[0]
        setSelectedMenuIdState(autoMenu.id)
        localStorage.setItem(STORAGE_KEYS.MENU_ID, autoMenu.id)
      }
    }
  }, [hasInitialized, selectedRestaurantId, menusData, selectedMenuId])

  // Validate selections - if selected restaurant/menu no longer exists, clear it
  useEffect(() => {
    if (hasInitialized && restaurants.length > 0 && selectedRestaurantId) {
      const restaurantExists = restaurants.some(r => r.id === selectedRestaurantId)
      if (!restaurantExists) {
        setSelectedRestaurantIdState(null)
        setSelectedMenuIdState(null)
        localStorage.removeItem(STORAGE_KEYS.RESTAURANT_ID)
        localStorage.removeItem(STORAGE_KEYS.MENU_ID)
      }
    }
  }, [hasInitialized, restaurants, selectedRestaurantId])

  useEffect(() => {
    if (hasInitialized && menusData.length > 0 && selectedMenuId) {
      const menuExists = menusData.some(m => m.id === selectedMenuId)
      if (!menuExists) {
        setSelectedMenuIdState(null)
        localStorage.removeItem(STORAGE_KEYS.MENU_ID)
      }
    }
  }, [hasInitialized, menusData, selectedMenuId])

  // Helper functions
  const setSelectedRestaurant = (restaurant: Restaurant | null) => {
    const restaurantId = restaurant?.id || null
    setSelectedRestaurantIdState(restaurantId)
    setSelectedMenuIdState(null) // Clear menu when restaurant changes

    if (restaurantId) {
      localStorage.setItem(STORAGE_KEYS.RESTAURANT_ID, restaurantId)
    } else {
      localStorage.removeItem(STORAGE_KEYS.RESTAURANT_ID)
    }
    localStorage.removeItem(STORAGE_KEYS.MENU_ID)
  }

  const setSelectedMenu = (menu: Menu | null) => {
    const menuId = menu?.id || null
    setSelectedMenuIdState(menuId)

    if (menuId) {
      localStorage.setItem(STORAGE_KEYS.MENU_ID, menuId)
    } else {
      localStorage.removeItem(STORAGE_KEYS.MENU_ID)
    }
  }

  const setSelectedRestaurantById = (restaurantId: string | null) => {
    const restaurant = restaurants.find(r => r.id === restaurantId) || null
    setSelectedRestaurant(restaurant)
  }

  const setSelectedMenuById = (menuId: string | null) => {
    const menu = menusData.find(m => m.id === menuId) || null
    setSelectedMenu(menu)
  }

  // Get current objects
  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId) || null
  const selectedMenu = menusData.find(m => m.id === selectedMenuId) || null

  const contextValue: RestaurantMenuContextType = {
    selectedRestaurant,
    selectedMenu,
    selectedRestaurantId,
    selectedMenuId,
    restaurants,
    menus: menusData,
    setSelectedRestaurant,
    setSelectedMenu,
    setSelectedRestaurantById,
    setSelectedMenuById,
    isLoading: restaurantsLoading || !hasInitialized,
    error: restaurantsError?.message || null
  }

  return (
    <RestaurantMenuContext.Provider value={contextValue}>
      {children}
    </RestaurantMenuContext.Provider>
  )
}

export function useRestaurantMenu() {
  const context = useContext(RestaurantMenuContext)
  if (context === undefined) {
    throw new Error('useRestaurantMenu must be used within a RestaurantMenuProvider')
  }
  return context
}