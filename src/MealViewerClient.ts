/**
 * MealViewer API Client
 *
 * TypeScript/JavaScript client for the MealViewer School Lunch Menu API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  GetMenuRequest,
  GetMenuResponse,
  DailyMenu,
  MenuBlock,
  CafeteriaLine,
  MenuItem,
  MealViewerSchool,
  MealViewerError,
  RawMealViewerResponse,
} from './types';

export interface MealViewerClientConfig {
  baseURL?: string;
  timeout?: number;
  userAgent?: string;
  debug?: boolean;
}

export class MealViewerClient {
  private axios: AxiosInstance;
  private debug: boolean;

  constructor(config: MealViewerClientConfig = {}) {
    this.debug = config.debug || false;

    this.axios = axios.create({
      baseURL: config.baseURL || 'https://api.mealviewer.com/api/v4',
      timeout: config.timeout || 30000,
      headers: {
        'User-Agent': config.userAgent || 'BrandCast/FamilyCast MealViewer Integration',
      },
    });

    this.log('MealViewerClient initialized');
  }

  /**
   * Get menu for a school and date range
   */
  async getMenu(request: GetMenuRequest): Promise<GetMenuResponse> {
    const startDate = this.formatDate(request.startDate);
    const endDate = request.endDate
      ? this.formatDate(request.endDate)
      : startDate;

    const url = `/school/${request.schoolName}/${startDate}/${endDate}/`;

    this.log(`Fetching menu: GET ${url}`);

    try {
      const response = await this.axios.get<RawMealViewerResponse>(url);
      this.log('Menu fetched successfully');

      return this.parseResponse(response.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Format Date object or string to MM-DD-YYYY string
   */
  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      // Assume YYYY-MM-DD format, convert to MM-DD-YYYY
      const parts = date.split('-');
      if (parts.length !== 3) {
        throw new MealViewerError(`Invalid date format: ${date}. Expected YYYY-MM-DD`, 'INVALID_DATE');
      }
      const [year, month, day] = parts;
      return `${month}-${day}-${year}`;
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  }

  /**
   * Parse MealViewer API response into simplified format
   */
  private parseResponse(data: RawMealViewerResponse): GetMenuResponse {
    // Parse school information
    const school: MealViewerSchool = {
      name: data.physicalLocation.name,
      address: data.physicalLocation.address,
      city: data.physicalLocation.city,
      state: data.physicalLocation.state,
      latitude: data.physicalLocation.latitude,
      longitude: data.physicalLocation.longitude,
    };

    // Parse menus for each date
    const menus: DailyMenu[] = data.menuSchedules.map((schedule) => {
      const date = new Date(schedule.dateInformation.dateFull);

      const meals: MenuBlock[] = schedule.menuBlocks.map((block) => {
        // Determine meal period from block name
        const blockName = block.blockName.toLowerCase();
        let mealPeriod: MenuBlock['mealPeriod'] = 'Lunch';

        if (blockName.includes('breakfast')) {
          mealPeriod = 'Breakfast';
        } else if (blockName.includes('lunch')) {
          mealPeriod = 'Lunch';
        } else if (blockName.includes('dinner')) {
          mealPeriod = 'Dinner';
        } else if (blockName.includes('snack')) {
          mealPeriod = 'Snack';
        }

        const cafeteriaLines: CafeteriaLine[] = block.cafeteriaLineList.data.map((line) => ({
          name: line.name,
          items: line.foodItemList.data.map((item): MenuItem => ({
            name: item.item_Name,
            altName: item.item_AltName || undefined,
            description: item.description || undefined,
            type: item.item_Type,
            servingSize: item.serving_Size,
            // Nutrition and allergens parsing would go here if needed
            // For now, leaving simplified
          })),
        }));

        return {
          mealPeriod,
          cafeteriaLines,
        };
      });

      return {
        date,
        school,
        meals,
      };
    });

    return {
      menus,
      school,
    };
  }

  /**
   * Handle API errors
   */
  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 404) {
        this.log('School not found (404)');
        throw new MealViewerError(
          'School not found. Please check the school name and try again.',
          'SCHOOL_NOT_FOUND'
        );
      }

      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT') {
        this.log('Network error:', axiosError.code);
        throw new MealViewerError(
          `Network error: ${axiosError.code}. Please check your internet connection.`,
          'NETWORK_ERROR'
        );
      }

      this.log('API error:', axiosError.message);
      throw new MealViewerError(
        `API request failed: ${axiosError.message}`,
        'API_ERROR'
      );
    }

    // Unknown error
    this.log('Unknown error:', error);
    throw new MealViewerError(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      'API_ERROR'
    );
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[MealViewerClient]', ...args);
    }
  }
}
