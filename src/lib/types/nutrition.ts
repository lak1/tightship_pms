export interface NutritionalInfo {
  calories?: number
  protein?: number // grams
  carbohydrates?: number // grams
  fat?: number // grams
  saturatedFat?: number // grams
  sugar?: number // grams
  fiber?: number // grams
  sodium?: number // milligrams
  cholesterol?: number // milligrams
  calcium?: number // milligrams
  iron?: number // milligrams
  vitaminC?: number // milligrams
  vitaminA?: number // micrograms
  servingSize?: string // e.g., "100g", "1 portion"
  servingUnit?: string // e.g., "per 100g", "per portion"
}

export const NUTRITION_FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', type: 'number' },
  { key: 'protein', label: 'Protein', unit: 'g', type: 'number' },
  { key: 'carbohydrates', label: 'Carbohydrates', unit: 'g', type: 'number' },
  { key: 'fat', label: 'Total Fat', unit: 'g', type: 'number' },
  { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g', type: 'number' },
  { key: 'sugar', label: 'Sugar', unit: 'g', type: 'number' },
  { key: 'fiber', label: 'Fiber', unit: 'g', type: 'number' },
  { key: 'sodium', label: 'Sodium', unit: 'mg', type: 'number' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', type: 'number' },
  { key: 'calcium', label: 'Calcium', unit: 'mg', type: 'number' },
  { key: 'iron', label: 'Iron', unit: 'mg', type: 'number' },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg', type: 'number' },
  { key: 'vitaminA', label: 'Vitamin A', unit: 'μg', type: 'number' },
  { key: 'servingSize', label: 'Serving Size', unit: '', type: 'text' },
  { key: 'servingUnit', label: 'Serving Unit', unit: '', type: 'text' }
] as const