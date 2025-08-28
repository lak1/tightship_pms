# Menu API Integration Guide

This guide shows how to integrate your restaurant menu from TightShip PMS into various platforms.

## API Endpoint

```
GET https://your-pms-domain.com/api/public/menu/{restaurantId}
```

### Query Parameters

- `format`: `json` (full details) or `simple` (basic structure)
- `apiKey`: Optional API key for rate limiting (future feature)
- `includeInactive`: `true/false` - Include inactive items (default: false)

## Integration Examples

### 1. Astro Site Integration

**Install dependencies:**
```bash
npm install node-fetch
```

**Create a data fetcher (`src/lib/menu.js`):**
```javascript
// src/lib/menu.js
const MENU_API = 'https://your-pms-domain.com/api/public/menu/YOUR_RESTAURANT_ID';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let cachedMenu = null;
let cacheTime = 0;

export async function getMenu() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedMenu && (now - cacheTime) < CACHE_DURATION) {
    return cachedMenu;
  }
  
  try {
    const response = await fetch(`${MENU_API}?format=simple`);
    const data = await response.json();
    
    // Update cache
    cachedMenu = data;
    cacheTime = now;
    
    return data;
  } catch (error) {
    console.error('Failed to fetch menu:', error);
    // Return cached data even if expired, or fallback
    return cachedMenu || { categories: [] };
  }
}
```

**Use in your Astro page:**
```astro
---
// src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import { getMenu } from '../lib/menu.js';

const menuData = await getMenu();
---

<Layout title="Restaurant">
  <section id="menu">
    <h2>Our Menu</h2>
    {menuData.categories.map((category) => (
      <div class="menu-category">
        <h3>{category.name}</h3>
        <div class="menu-items">
          {category.items.map((item) => (
            <div class="menu-item">
              <span class="item-name">{item.name}</span>
              {item.description && <span class="item-desc">{item.description}</span>}
              <span class="item-price">£{item.price}</span>
            </div>
          ))}
        </div>
      </div>
    ))}
  </section>
</Layout>
```

### 2. Plain HTML/JavaScript Integration

```html
<!DOCTYPE html>
<html>
<head>
    <title>Restaurant Menu</title>
    <style>
        .menu-category { margin-bottom: 2rem; }
        .menu-item { 
            display: flex; 
            justify-content: space-between; 
            padding: 0.5rem 0;
            border-bottom: 1px dotted #ccc;
        }
        .item-price { font-weight: bold; }
        .loading { text-align: center; padding: 2rem; }
        .error { color: red; padding: 1rem; }
    </style>
</head>
<body>
    <h1>Our Menu</h1>
    <div id="menu-container">
        <div class="loading">Loading menu...</div>
    </div>

    <script>
        const MENU_API = 'https://your-pms-domain.com/api/public/menu/YOUR_RESTAURANT_ID?format=simple';
        
        async function loadMenu() {
            const container = document.getElementById('menu-container');
            
            try {
                const response = await fetch(MENU_API);
                const data = await response.json();
                
                if (!data.categories) {
                    throw new Error('Invalid menu data');
                }
                
                let html = '';
                data.categories.forEach(category => {
                    html += `<div class="menu-category">`;
                    html += `<h2>${category.name}</h2>`;
                    html += `<div class="menu-items">`;
                    
                    category.items.forEach(item => {
                        html += `<div class="menu-item">`;
                        html += `<div>`;
                        html += `<span class="item-name">${item.name}</span>`;
                        if (item.description) {
                            html += `<br><small>${item.description}</small>`;
                        }
                        html += `</div>`;
                        html += `<span class="item-price">£${item.price}</span>`;
                        html += `</div>`;
                    });
                    
                    html += `</div></div>`;
                });
                
                container.innerHTML = html;
                
            } catch (error) {
                container.innerHTML = `<div class="error">Failed to load menu. Please try again later.</div>`;
                console.error('Menu loading error:', error);
            }
        }
        
        // Load menu when page loads
        loadMenu();
        
        // Refresh menu every 5 minutes
        setInterval(loadMenu, 5 * 60 * 1000);
    </script>
</body>
</html>
```

### 3. WordPress Plugin Integration

Create a simple WordPress plugin:

**File: `tightship-menu/tightship-menu.php`**
```php
<?php
/**
 * Plugin Name: TightShip Menu
 * Description: Display restaurant menu from TightShip PMS
 * Version: 1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Add shortcode for menu display
add_shortcode('tightship_menu', 'tightship_menu_shortcode');

function tightship_menu_shortcode($atts) {
    $atts = shortcode_atts(array(
        'restaurant_id' => '',
        'cache_time' => 300, // 5 minutes
    ), $atts);
    
    if (empty($atts['restaurant_id'])) {
        return '<p>Error: Restaurant ID required</p>';
    }
    
    // Try to get cached menu
    $cache_key = 'tightship_menu_' . $atts['restaurant_id'];
    $cached_menu = get_transient($cache_key);
    
    if ($cached_menu === false) {
        // Fetch fresh menu
        $api_url = 'https://your-pms-domain.com/api/public/menu/' . 
                   $atts['restaurant_id'] . '?format=simple';
        
        $response = wp_remote_get($api_url);
        
        if (is_wp_error($response)) {
            return '<p>Error loading menu</p>';
        }
        
        $body = wp_remote_retrieve_body($response);
        $menu_data = json_decode($body, true);
        
        if (empty($menu_data['categories'])) {
            return '<p>No menu data available</p>';
        }
        
        // Cache the menu
        set_transient($cache_key, $menu_data, $atts['cache_time']);
    } else {
        $menu_data = $cached_menu;
    }
    
    // Generate HTML
    ob_start();
    ?>
    <div class="tightship-menu">
        <?php foreach ($menu_data['categories'] as $category): ?>
            <div class="menu-category">
                <h3><?php echo esc_html($category['name']); ?></h3>
                <div class="menu-items">
                    <?php foreach ($category['items'] as $item): ?>
                        <div class="menu-item">
                            <div class="item-details">
                                <span class="item-name">
                                    <?php echo esc_html($item['name']); ?>
                                </span>
                                <?php if (!empty($item['description'])): ?>
                                    <span class="item-description">
                                        <?php echo esc_html($item['description']); ?>
                                    </span>
                                <?php endif; ?>
                            </div>
                            <span class="item-price">
                                £<?php echo esc_html($item['price']); ?>
                            </span>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
    <?php
    return ob_get_clean();
}

// Add basic styles
add_action('wp_head', 'tightship_menu_styles');

function tightship_menu_styles() {
    ?>
    <style>
        .tightship-menu .menu-category { margin-bottom: 2rem; }
        .tightship-menu .menu-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px dotted #ddd;
        }
        .tightship-menu .item-name { font-weight: 500; }
        .tightship-menu .item-description {
            display: block;
            font-size: 0.9em;
            color: #666;
        }
        .tightship-menu .item-price { 
            font-weight: bold;
            white-space: nowrap;
        }
    </style>
    <?php
}
```

**Usage in WordPress:**
```
[tightship_menu restaurant_id="YOUR_RESTAURANT_ID"]
```

### 4. React Component

```jsx
import { useState, useEffect } from 'react';

const RestaurantMenu = ({ restaurantId }) => {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(
          `https://your-pms-domain.com/api/public/menu/${restaurantId}?format=simple`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch menu');
        }
        
        const data = await response.json();
        setMenu(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
    // Refresh every 5 minutes
    const interval = setInterval(fetchMenu, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [restaurantId]);

  if (loading) return <div>Loading menu...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!menu) return null;

  return (
    <div className="restaurant-menu">
      <h2>{menu.restaurant} Menu</h2>
      {menu.categories.map((category, idx) => (
        <div key={idx} className="menu-category">
          <h3>{category.name}</h3>
          <div className="menu-items">
            {category.items.map((item, itemIdx) => (
              <div key={itemIdx} className="menu-item">
                <div>
                  <span className="item-name">{item.name}</span>
                  {item.description && (
                    <span className="item-description">{item.description}</span>
                  )}
                </div>
                <span className="item-price">£{item.price}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <small>Last updated: {new Date(menu.lastUpdated).toLocaleString()}</small>
    </div>
  );
};

export default RestaurantMenu;
```

## Security & Performance Notes

1. **CORS**: The API includes `Access-Control-Allow-Origin: *` header for cross-domain access
2. **Caching**: Responses are cached for 5 minutes (`Cache-Control` header)
3. **Rate Limiting**: Consider implementing API keys for production
4. **CDN**: Use a CDN to cache responses globally for better performance

## Finding Your Restaurant ID

1. Log into TightShip PMS
2. Go to Restaurants
3. Click on your restaurant
4. The ID will be in the URL: `/restaurants/[YOUR_RESTAURANT_ID]`

## Testing

Test the API directly in your browser:
```
https://your-pms-domain.com/api/public/menu/YOUR_RESTAURANT_ID?format=simple
```

## Support

For issues or questions, contact your TightShip PMS administrator.