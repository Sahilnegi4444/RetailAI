/**
 * Prediction Service - Handles all API calls for predictions
 */

// Use relative path for API calls (proxied through nginx)
// In Docker: /api/ → nginx → backend:8003
// In local dev: http://localhost:8003
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:8003' 
  : '/api';

console.log('[PREDICTION SERVICE] API Base URL:', API_BASE_URL);

export const predictionService = {
  /**
   * Get bulk predictions for a specific date
   */
  async getBulkPredictions(predictionDate) {
    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prediction_date: predictionDate }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[PREDICTION SERVICE] Error:', error);
      throw error;
    }
  },

  /**
   * Get all items from database
   */
  async getAllItems() {
    try {
      const response = await fetch(`${API_BASE_URL}/all_items`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[PREDICTION SERVICE] Error:', error);
      throw error;
    }
  },

  /**
   * Export predictions to CSV
   */
  exportToCSV(predictions, filename = 'predictions.csv') {
    const headers = [
      'Item Name',
      'Category',
      'Current Stock',
      'Predicted Demand',
      'Trend',
      'Growth Rate',
      'Recommended Order',
      'Confidence',
    ];

    const rows = predictions.map(p => [
      p.item_name,
      p.category,
      p.current_stock || 0,
      Math.round(p.final_prediction || 0),
      p.trend || 'stable',
      `${((p.growth_rate || 0) * 100).toFixed(1)}%`,
      Math.round(p.recommended_order || 0),
      `${((p.confidence || 0) * 100).toFixed(1)}%`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
