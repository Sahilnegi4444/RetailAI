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
      console.log('[PREDICTION SERVICE] Body:', JSON.stringify(body));
      console.log('[PREDICTION SERVICE] Full URL:', window.location.origin + url);
      console.log('[PREDICTION SERVICE] API_BASE_URL:', API_BASE_URL);
      console.log('[PREDICTION SERVICE] Window location:', {
        origin: window.location.origin,
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol,
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
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
        console.error('[PREDICTION SERVICE] Error response body:', errorText);
        console.error('[PREDICTION SERVICE] Error status:', response.status);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[PREDICTION SERVICE] Success - predictions count:', data.predictions?.length);
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
   * Export predictions to CSV with historical data and cost calculations
   */
  exportToCSV(predictions, filename = 'predictions.csv') {
    const headers = [
      'Item Name',
      'Category',
      'Unit Cost (₹)',
      'Current Stock',
      'Predicted Demand (Units)',
      'Total Cost (₹)',
      'Trend',
      'Growth Rate',
      'Recommended Order',
      'Confidence',
      '2024 Total Sales',
      '2025 Total Sales',
      'Month 1 Name',
      'Month 1 Sales',
      'Month 2 Name',
      'Month 2 Sales',
      'Month 3 Name',
      'Month 3 Sales',
    ];

    let totalNetCost = 0;
    let totalPredictedDemand = 0;

    const rows = predictions.map(p => {
      // Get last 3 months data
      const last3Months = p.last_3_months || [];
      
      const unitCost = p.price || 0;
      const predictedDemand = Math.round(p.final_prediction || 0);
      const totalCost = unitCost * predictedDemand;
      
      totalNetCost += totalCost;
      totalPredictedDemand += predictedDemand;
      
      return [
        p.item_name,
        p.category,
        unitCost.toFixed(2),
        p.current_stock || 0,
        predictedDemand,
        totalCost.toFixed(2),
        p.trend || 'stable',
        `${((p.growth_rate || 0) * 100).toFixed(1)}%`,
        Math.round(p.recommended_order || 0),
        `${((p.confidence || 0) * 100).toFixed(1)}%`,
        p.year_2024_total || 0,
        p.year_2025_total || 0,
        last3Months[0]?.month_name || 'N/A',
        last3Months[0]?.sales || 0,
        last3Months[1]?.month_name || 'N/A',
        last3Months[1]?.sales || 0,
        last3Months[2]?.month_name || 'N/A',
        last3Months[2]?.sales || 0,
      ];
    });

    // Add summary row
    const summaryRow = [
      'TOTAL',
      '',
      '',
      '',
      totalPredictedDemand,
      totalNetCost.toFixed(2),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      summaryRow.map(cell => `"${cell}"`).join(','),
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
