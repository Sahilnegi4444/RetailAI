/**
 * Prediction Service - Handles all API calls for predictions
 */

// Use /api proxy in Docker, direct localhost:8001 for local dev
const API_BASE_URL = window.location.port === '5016'
  ? '/api'
  : 'http://localhost:8001';

console.log('[PREDICTION SERVICE] API Base URL:', API_BASE_URL);

export const predictionService = {
  /**
   * Get bulk predictions for a specific date
   */
  async getBulkPredictions(predictionDate) {
    try {
      const url = `${API_BASE_URL}/predict`;
      const body = { prediction_date: predictionDate };
      
      console.log('[PREDICTION SERVICE] Calling:', url);
      console.log('[PREDICTION SERVICE] Body:', body);
      console.log('[PREDICTION SERVICE] Full URL:', window.location.origin + url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('[PREDICTION SERVICE] Response status:', response.status);
      console.log('[PREDICTION SERVICE] Response headers:', {
        'content-type': response.headers.get('content-type'),
        'x-proxy-by': response.headers.get('x-proxy-by'),
        'x-backend-server': response.headers.get('x-backend-server'),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PREDICTION SERVICE] Error response:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[PREDICTION SERVICE] Success:', data);
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
