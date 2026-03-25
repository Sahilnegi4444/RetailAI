/**
 * Analytics Service - Handles dashboard analytics API calls
 */

// Use /api proxy in Docker, direct localhost:8001 for local dev
const API_BASE_URL = window.location.port === '5016'
  ? '/api'
  : 'http://localhost:8001';

console.log('[ANALYTICS SERVICE] API Base URL:', API_BASE_URL);

export const analyticsService = {
  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting stats:', error);
      throw error;
    }
  },

  /**
   * Get all items with statistics
   */
  async getAllItems() {
    try {
      const response = await fetch(`${API_BASE_URL}/all_items`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting items:', error);
      throw error;
    }
  },

  /**
   * Get item analytics (patterns, trends, seasonal factors)
   */
  async getItemAnalytics(itemName) {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/item/${encodeURIComponent(itemName)}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting item analytics:', error);
      throw error;
    }
  },

  /**
   * Get month context for specific item and month
   */
  async getMonthContext(itemName, month) {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/item/${encodeURIComponent(itemName)}/month/${month}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting month context:', error);
      throw error;
    }
  },

  /**
   * Get database items list
   */
  async getDatabaseItems() {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/database/items`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting database items:', error);
      throw error;
    }
  },

  /**
   * Get item history
   */
  async getItemHistory(itemName) {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/database/item/${encodeURIComponent(itemName)}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting item history:', error);
      throw error;
    }
  },

  /**
   * Calculate year-wise statistics from items
   */
  calculateYearWiseStats(items) {
    const yearStats = {};
    
    items.forEach(item => {
      const year = new Date(item.date || item.year).getFullYear();
      if (!yearStats[year]) {
        yearStats[year] = {
          totalSales: 0,
          totalRevenue: 0,
          itemCount: 0,
          categories: new Set(),
        };
      }
      
      yearStats[year].totalSales += item.total_sold || 0;
      yearStats[year].totalRevenue += item.revenue || 0;
      yearStats[year].itemCount++;
      if (item.category) yearStats[year].categories.add(item.category);
    });
    
    // Convert Set to array
    Object.keys(yearStats).forEach(year => {
      yearStats[year].categories = Array.from(yearStats[year].categories);
    });
    
    return yearStats;
  },

  /**
   * Calculate category-wise statistics
   */
  calculateCategoryStats(items) {
    const categoryStats = {};
    
    items.forEach(item => {
      const category = item.category || 'Unknown';
      if (!categoryStats[category]) {
        categoryStats[category] = {
          totalSales: 0,
          totalRevenue: 0,
          itemCount: 0,
          avgPrice: 0,
        };
      }
      
      categoryStats[category].totalSales += item.total_sold || 0;
      categoryStats[category].totalRevenue += item.revenue || 0;
      categoryStats[category].itemCount++;
    });
    
    // Calculate average price
    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category];
      stats.avgPrice = stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0;
    });
    
    return categoryStats;
  },

  /**
   * Get top performing items
   */
  getTopItems(items, limit = 10, sortBy = 'total_sold') {
    return [...items]
      .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))
      .slice(0, limit);
  },

  /**
   * Calculate monthly trends from history
   */
  calculateMonthlyTrends(history) {
    const monthlyData = {};
    
    history.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          date: monthKey,
          sales: 0,
          count: 0,
        };
      }
      
      monthlyData[monthKey].sales += record.quantity_sold || 0;
      monthlyData[monthKey].count++;
    });
    
    return Object.values(monthlyData).sort((a, b) => a.date.localeCompare(b.date));
  },
};
