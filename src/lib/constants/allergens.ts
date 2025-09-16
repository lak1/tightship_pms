export const STANDARD_ALLERGENS = [
  'Cereals containing gluten',
  'Crustaceans',
  'Eggs',
  'Fish',
  'Peanuts',
  'Soybeans',
  'Milk',
  'Nuts',
  'Celery',
  'Mustard',
  'Sesame seeds',
  'Sulphur dioxide and sulphites',
  'Lupin',
  'Molluscs'
] as const

export type StandardAllergen = typeof STANDARD_ALLERGENS[number]

export const ALLERGEN_ICONS: Record<StandardAllergen, string> = {
  'Cereals containing gluten': '🌾',
  'Crustaceans': '🦐',
  'Eggs': '🥚',
  'Fish': '🐟',
  'Peanuts': '🥜',
  'Soybeans': '🫘',
  'Milk': '🥛',
  'Nuts': '🌰',
  'Celery': '🥬',
  'Mustard': '🟡',
  'Sesame seeds': '🌱',
  'Sulphur dioxide and sulphites': '🧪',
  'Lupin': '💙',
  'Molluscs': '🦪'
}

export const COMMON_DIETARY_INFO = [
  'Vegetarian',
  'Vegan',
  'Halal',
  'Kosher',
  'Gluten Free',
  'Dairy Free',
  'Low Carb',
  'Keto',
  'Organic',
  'Spicy',
  'Low Sugar',
  'High Protein'
] as const

export type DietaryInfo = typeof COMMON_DIETARY_INFO[number]