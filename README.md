# MealViewer API Client

[![npm version](https://badge.fury.io/js/%40brandcast_app%2Fmealviewer-api-client.svg)](https://badge.fury.io/js/%40brandcast_app%2Fmealviewer-api-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript/JavaScript client for the MealViewer School Lunch Menu API.

## Features

- 📅 Fetch school lunch menus by date
- 🍎 Access nutrition information and allergens
- 📦 TypeScript support with full type definitions
- 🛡️ Error handling and type safety
- 🐛 Optional debug logging
- ✅ Public API (no authentication required)

## Installation

```bash
npm install @brandcast_app/mealviewer-api-client
```

or

```bash
yarn add @brandcast_app/mealviewer-api-client
```

## Quick Start

```typescript
import { MealViewerClient } from '@brandcast_app/mealviewer-api-client';

// Create a client instance
const client = new MealViewerClient({
  debug: true, // Optional: enable debug logging
  timeout: 30000, // Optional: request timeout in ms (default: 30000)
});

// Get today's menu for a school
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const result = await client.getMenu({
  schoolName: 'ElmwoodElementary',
  startDate: today,
});

// Display menus
for (const menu of result.menus) {
  console.log(`\nMenu for ${menu.date.toDateString()}`);
  console.log(`School: ${menu.school.name}`);

  for (const meal of menu.meals) {
    console.log(`\n${meal.mealPeriod}:`);

    for (const line of meal.cafeteriaLines) {
      console.log(`  ${line.name}:`);

      for (const item of line.items) {
        console.log(`    - ${item.name} (${item.servingSize})`);
      }
    }
  }
}
```

## API Reference

### Constructor

#### `new MealViewerClient(config?)`

Create a new MealViewer API client.

**Parameters:**
- `config` (optional): Configuration object
  - `baseURL` (string): API base URL (default: `https://api.mealviewer.com/api/v4`)
  - `timeout` (number): Request timeout in ms (default: `30000`)
  - `userAgent` (string): Custom user agent
  - `debug` (boolean): Enable debug logging (default: `false`)

**Example:**
```typescript
const client = new MealViewerClient({ debug: true });
```

---

### Methods

#### `getMenu(request: GetMenuRequest): Promise<GetMenuResponse>`

Get menu for a school and date range.

**Parameters:**
- `request.schoolName` (string): School identifier (e.g., `"ElmwoodElementary"`)
- `request.startDate` (Date | string): Start date (YYYY-MM-DD or Date object)
- `request.endDate` (Date | string, optional): End date (defaults to startDate)

**Returns:** Promise with menus and school information

**Example:**
```typescript
// Get menu for single day
const result = await client.getMenu({
  schoolName: 'ElmwoodElementary',
  startDate: '2025-01-15',
});

// Get menu for date range (week)
const weekResult = await client.getMenu({
  schoolName: 'ElmwoodElementary',
  startDate: '2025-01-13', // Monday
  endDate: '2025-01-17',   // Friday
});

console.log(`Found ${weekResult.menus.length} days of menus`);
```

---

## Type Definitions

### GetMenuResponse

```typescript
interface GetMenuResponse {
  menus: DailyMenu[];
  school: MealViewerSchool;
}
```

### DailyMenu

```typescript
interface DailyMenu {
  date: Date;
  school: MealViewerSchool;
  meals: MenuBlock[];
}
```

### MenuBlock

```typescript
interface MenuBlock {
  mealPeriod: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  cafeteriaLines: CafeteriaLine[];
}
```

### CafeteriaLine

```typescript
interface CafeteriaLine {
  name: string;
  items: MenuItem[];
}
```

### MenuItem

```typescript
interface MenuItem {
  name: string;
  altName?: string;
  description?: string;
  type: 'Entree' | 'Side' | 'Vegetable' | 'Fruit' | 'Milk' | 'Condiment' | string;
  servingSize: string;
  nutrition?: NutritionFacts;
  allergens?: string[];
}
```

### MealViewerSchool

```typescript
interface MealViewerSchool {
  name: string;
  address: string;
  city: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}
```

---

## Error Handling

The client throws `MealViewerError` with a specific error code:

```typescript
class MealViewerError extends Error {
  code: 'SCHOOL_NOT_FOUND' | 'API_ERROR' | 'INVALID_DATE' | 'NETWORK_ERROR';
}
```

**Example:**
```typescript
try {
  const result = await client.getMenu({
    schoolName: 'InvalidSchool',
    startDate: '2025-01-15',
  });
} catch (error) {
  if (error instanceof MealViewerError) {
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    if (error.code === 'SCHOOL_NOT_FOUND') {
      console.log('Please check the school name and try again.');
    }
  }
}
```

---

## Finding School Names

School identifiers are not searchable via the API. To find a school's identifier:

1. Visit https://www.mealviewer.com
2. Search for your school district
3. Select your school
4. Inspect the URL or page source to find the school identifier
5. Identifiers are typically CamelCase without spaces (e.g., `"ElmwoodElementary"`)

---

## Complete Example

```typescript
import { MealViewerClient, MealViewerError } from '@brandcast_app/mealviewer-api-client';

async function main() {
  const client = new MealViewerClient({ debug: true });

  try {
    // Get this week's menus
    const monday = new Date('2025-01-13');
    const friday = new Date('2025-01-17');

    const result = await client.getMenu({
      schoolName: 'ElmwoodElementary',
      startDate: monday,
      endDate: friday,
    });

    console.log(`\n${result.school.name}`);
    console.log(`${result.school.address}, ${result.school.city}`);
    console.log(`\nMenus for ${result.menus.length} days:\n`);

    for (const menu of result.menus) {
      console.log(`\n=== ${menu.date.toDateString()} ===`);

      const lunch = menu.meals.find(m => m.mealPeriod === 'Lunch');

      if (lunch) {
        for (const line of lunch.cafeteriaLines) {
          console.log(`\n${line.name}:`);
          for (const item of line.items) {
            console.log(`  • ${item.name} - ${item.servingSize}`);
            if (item.description) {
              console.log(`    ${item.description}`);
            }
          }
        }
      }
    }

  } catch (error) {
    if (error instanceof MealViewerError) {
      console.error(`\n❌ ${error.code}: ${error.message}`);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

main();
```

---

## Development

### Building

```bash
npm install
npm run build
```

### Testing

```bash
npm test
npm run test:coverage
```

---

## Use Cases

This client is useful for:
- 📱 Family information displays (FamilyCast)
- 🏫 School district apps
- 📧 Parent notification systems
- 🤖 Chat bot integrations (e.g., Claude Desktop via MCP)
- 📊 Menu analytics and tracking

---

## Related Projects

- [mealviewer-mcp-server](https://github.com/BrandCast-Signage/mealviewer-mcp-server) - MCP server for Claude Desktop
- [FamilyCast](https://familycast.app) - Family information displays

---

## Legal

This is an unofficial library and is not affiliated with, endorsed by, or connected to MealViewer. The MealViewer API is public and does not require authentication.

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## Support

- 🐛 [Report Issues](https://github.com/BrandCast-Signage/mealviewer-api-client/issues)
- 💬 [Discussions](https://github.com/BrandCast-Signage/mealviewer-api-client/discussions)

---

## Changelog

### 0.1.0 (Initial Release)

- ✨ Initial implementation
- 📅 Fetch menus by date range
- 🍎 Access menu items, nutrition, allergens
- 📦 Full TypeScript support
- 🐛 Debug logging option
