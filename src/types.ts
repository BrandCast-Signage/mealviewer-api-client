/**
 * MealViewer API Types
 *
 * Type definitions for the MealViewer School Lunch Menu API
 */

export interface MealViewerSchool {
  name: string;
  address: string;
  city: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}

export interface MenuItem {
  name: string;
  altName?: string;
  description?: string;
  type: 'Entree' | 'Side' | 'Vegetable' | 'Fruit' | 'Milk' | 'Condiment' | string;
  servingSize: string;
  nutrition?: NutritionFacts;
  allergens?: string[];
}

export interface NutritionFacts {
  calories: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  sodium?: number;
  sugar?: number;
  fiber?: number;
}

export interface CafeteriaLine {
  name: string;
  items: MenuItem[];
}

export interface MenuBlock {
  mealPeriod: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  cafeteriaLines: CafeteriaLine[];
}

export interface DailyMenu {
  date: Date;
  school: MealViewerSchool;
  meals: MenuBlock[];
}

export interface GetMenuRequest {
  schoolName: string;
  startDate: Date | string; // YYYY-MM-DD or Date object
  endDate?: Date | string;  // Optional, defaults to startDate
}

export interface GetMenuResponse {
  menus: DailyMenu[];
  school: MealViewerSchool;
}

export class MealViewerError extends Error {
  constructor(
    message: string,
    public code: 'SCHOOL_NOT_FOUND' | 'API_ERROR' | 'INVALID_DATE' | 'NETWORK_ERROR'
  ) {
    super(message);
    this.name = 'MealViewerError';
  }
}

/**
 * Raw API Response Types (internal - not exported)
 */
export interface RawMealViewerResponse {
  physicalLocation: {
    name: string;
    address: string;
    city: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  menuSchedules: Array<{
    dateInformation: {
      dateFull: string; // ISO date string
    };
    menuBlocks: Array<{
      blockName: string;
      cafeteriaLineList: {
        data: Array<{
          name: string;
          foodItemList: {
            data: Array<{
              item_Name: string;
              item_AltName?: string;
              description?: string;
              item_Type: string;
              serving_Size: string;
              nutritionals?: any; // Complex nested structure
              allergens?: any;    // Complex nested structure
            }>;
          };
        }>;
      };
    }>;
  }>;
}
