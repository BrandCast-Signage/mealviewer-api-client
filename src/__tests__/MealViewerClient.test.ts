/**
 * Tests for MealViewerClient
 */

import { MealViewerClient } from '../MealViewerClient';
import { MealViewerError } from '../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MealViewerClient', () => {
  let client: MealViewerClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create client
    client = new MealViewerClient();
  });

  describe('Constructor', () => {
    it('should create client with default config', () => {
      const client = new MealViewerClient();
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.mealviewer.com/api/v4',
        timeout: 30000,
        headers: {
          'User-Agent': 'BrandCast/FamilyCast MealViewer Integration',
        },
      });
    });

    it('should create client with custom config', () => {
      const customConfig = {
        baseURL: 'https://custom-api.example.com',
        timeout: 60000,
        userAgent: 'Custom User Agent',
        debug: true,
      };

      new MealViewerClient(customConfig);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://custom-api.example.com',
        timeout: 60000,
        headers: {
          'User-Agent': 'Custom User Agent',
        },
      });
    });
  });

  describe('getMenu', () => {
    const mockResponse = {
      data: {
        physicalLocation: {
          name: 'Elmwood Elementary',
          address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          latitude: 39.7817,
          longitude: -89.6501,
        },
        menuSchedules: [
          {
            dateInformation: {
              dateFull: '2025-01-15T00:00:00',
            },
            menuBlocks: [
              {
                blockName: 'Lunch',
                cafeteriaLineList: {
                  data: [
                    {
                      name: 'Main Line',
                      foodItemList: {
                        data: [
                          {
                            item_Name: 'Pizza',
                            item_Type: 'Entree',
                            serving_Size: '2 slices',
                            description: 'Cheese pizza',
                          },
                          {
                            item_Name: 'Apple',
                            item_Type: 'Fruit',
                            serving_Size: '1 each',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };

    it('should fetch menu with string date', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getMenu({
        schoolName: 'ElmwoodElementary',
        startDate: '2025-01-15',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/school/ElmwoodElementary/01-15-2025/01-15-2025/'
      );

      expect(result.school.name).toBe('Elmwood Elementary');
      expect(result.menus).toHaveLength(1);
      expect(result.menus[0].meals).toHaveLength(1);
      expect(result.menus[0].meals[0].cafeteriaLines[0].items).toHaveLength(2);
    });

    it('should fetch menu with Date object', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const date = new Date('2025-01-15');

      const result = await client.getMenu({
        schoolName: 'ElmwoodElementary',
        startDate: date,
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/school/ElmwoodElementary/01-15-2025/01-15-2025/'
      );

      expect(result.menus[0].date).toBeInstanceOf(Date);
    });

    it('should fetch menu with date range', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await client.getMenu({
        schoolName: 'ElmwoodElementary',
        startDate: '2025-01-15',
        endDate: '2025-01-17',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/school/ElmwoodElementary/01-15-2025/01-17-2025/'
      );
    });

    it('should parse meal periods correctly', async () => {
      const breakfastResponse = {
        data: {
          ...mockResponse.data,
          menuSchedules: [
            {
              ...mockResponse.data.menuSchedules[0],
              menuBlocks: [
                {
                  blockName: 'Breakfast',
                  cafeteriaLineList: { data: [] },
                },
                {
                  blockName: 'Lunch',
                  cafeteriaLineList: { data: [] },
                },
              ],
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(breakfastResponse);

      const result = await client.getMenu({
        schoolName: 'ElmwoodElementary',
        startDate: '2025-01-15',
      });

      expect(result.menus[0].meals[0].mealPeriod).toBe('Breakfast');
      expect(result.menus[0].meals[1].mealPeriod).toBe('Lunch');
    });

    it('should parse menu items correctly', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getMenu({
        schoolName: 'ElmwoodElementary',
        startDate: '2025-01-15',
      });

      const items = result.menus[0].meals[0].cafeteriaLines[0].items;

      expect(items[0]).toMatchObject({
        name: 'Pizza',
        type: 'Entree',
        servingSize: '2 slices',
        description: 'Cheese pizza',
      });

      expect(items[1]).toMatchObject({
        name: 'Apple',
        type: 'Fruit',
        servingSize: '1 each',
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw SCHOOL_NOT_FOUND error for 404 response', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not Found',
      };

      mockAxiosInstance.get.mockRejectedValue(error);
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      await expect(
        client.getMenu({
          schoolName: 'InvalidSchool',
          startDate: '2025-01-15',
        })
      ).rejects.toThrow(MealViewerError);

      await expect(
        client.getMenu({
          schoolName: 'InvalidSchool',
          startDate: '2025-01-15',
        })
      ).rejects.toThrow('School not found');
    });

    it('should throw NETWORK_ERROR for connection errors', async () => {
      const error = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };

      mockAxiosInstance.get.mockRejectedValue(error);
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      await expect(
        client.getMenu({
          schoolName: 'ElmwoodElementary',
          startDate: '2025-01-15',
        })
      ).rejects.toThrow(MealViewerError);

      try {
        await client.getMenu({
          schoolName: 'ElmwoodElementary',
          startDate: '2025-01-15',
        });
      } catch (error) {
        expect((error as MealViewerError).code).toBe('NETWORK_ERROR');
      }
    });

    it('should throw NETWORK_ERROR for timeout', async () => {
      const error = {
        isAxiosError: true,
        code: 'ETIMEDOUT',
        message: 'Timeout',
      };

      mockAxiosInstance.get.mockRejectedValue(error);
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      try {
        await client.getMenu({
          schoolName: 'ElmwoodElementary',
          startDate: '2025-01-15',
        });
      } catch (error) {
        expect((error as MealViewerError).code).toBe('NETWORK_ERROR');
      }
    });

    it('should throw API_ERROR for other axios errors', async () => {
      const error = {
        isAxiosError: true,
        message: 'Server error',
      };

      mockAxiosInstance.get.mockRejectedValue(error);
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      try {
        await client.getMenu({
          schoolName: 'ElmwoodElementary',
          startDate: '2025-01-15',
        });
      } catch (error) {
        expect((error as MealViewerError).code).toBe('API_ERROR');
      }
    });

    it('should throw INVALID_DATE for malformed date string', async () => {
      await expect(
        client.getMenu({
          schoolName: 'ElmwoodElementary',
          startDate: 'invalid-date',
        })
      ).rejects.toThrow(MealViewerError);

      try {
        await client.getMenu({
          schoolName: 'ElmwoodElementary',
          startDate: 'invalid-date',
        });
      } catch (error) {
        expect((error as MealViewerError).code).toBe('INVALID_DATE');
      }
    });

    it('should handle unknown errors', async () => {
      const error = new Error('Unknown error');

      mockAxiosInstance.get.mockRejectedValue(error);
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(false);

      try {
        await client.getMenu({
          schoolName: 'ElmwoodElementary',
          startDate: '2025-01-15',
        });
      } catch (error) {
        expect((error as MealViewerError).code).toBe('API_ERROR');
        expect(error).toBeInstanceOf(MealViewerError);
      }
    });
  });

  describe('Date Formatting', () => {
    it('should format Date objects correctly', async () => {
      const mockResponse = {
        data: {
          physicalLocation: {
            name: 'Test School',
            address: '123 Main St',
            city: 'Test City',
          },
          menuSchedules: [],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await client.getMenu({
        schoolName: 'TestSchool',
        startDate: new Date(2025, 0, 5), // January 5, 2025
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/school/TestSchool/01-05-2025/01-05-2025/'
      );
    });

    it('should format string dates correctly', async () => {
      const mockResponse = {
        data: {
          physicalLocation: {
            name: 'Test School',
            address: '123 Main St',
            city: 'Test City',
          },
          menuSchedules: [],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await client.getMenu({
        schoolName: 'TestSchool',
        startDate: '2025-12-25',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/school/TestSchool/12-25-2025/12-25-2025/'
      );
    });
  });

  describe('MealViewerError', () => {
    it('should create error with correct properties', () => {
      const error = new MealViewerError('Test error', 'SCHOOL_NOT_FOUND');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('MealViewerError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('SCHOOL_NOT_FOUND');
    });

    it('should support all error codes', () => {
      const codes = ['SCHOOL_NOT_FOUND', 'API_ERROR', 'INVALID_DATE', 'NETWORK_ERROR'] as const;

      codes.forEach((code) => {
        const error = new MealViewerError('Test', code);
        expect(error.code).toBe(code);
      });
    });
  });
});
