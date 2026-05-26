/**
 * Prediction Service - Handles all API calls for predictions
 */

// Use /api proxy when running behind nginx (Docker), direct localhost for local dev
// Docker: nginx runs on 5016, proxies /api to backend:8001
// Local: frontend on 5173/5174/3000, backend on 8002
const isDocker = window.location.port === '5016' || window.location.hostname === 'localhost';
const API_BASE_URL = isDocker && window.location.port !== '5173' && window.location.port !== '5174' && window.location.port !== '3000'
  ? '/api'
  : 'http://localhost:8002';

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
   * Get aggregate future predictions for bulk ordering
   */
  async getFutureAggregatePredictions(predictionDate, nMonths, items = null) {
    try {
      const url = `${API_BASE_URL}/predict-future-aggregate`;
      const body = { 
        prediction_date: predictionDate,
        n_months: nMonths,
        items: items
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[PREDICTION SERVICE] Future Aggregate Error:', error);
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
    if (!predictions || predictions.length === 0) return;

    let totalSoldSum = 0;
    let totalCostSum = 0;
    let totalRevenueSum = 0;
    let totalProfitSum = 0;
    let totalOrderQtySum = 0;
    let totalOrderCostSum = 0;

    const dataRows = predictions.map(p => {
      const salesPrice = p.price || 0;
      const purchasePrice = p.purchase_price || 0;
      const predictedDemand = Math.round(p.final_prediction || p.prediction || 0);
      
      const expectedRevenue = salesPrice * predictedDemand;
      const expectedCost = purchasePrice * predictedDemand;
      const expectedProfit = expectedRevenue - expectedCost;
      
      const recommendedOrder = p.recommended_order || 0;
      const orderCost = recommendedOrder * purchasePrice;
      
      totalSoldSum += predictedDemand;
      totalCostSum += expectedCost;
      totalRevenueSum += expectedRevenue;
      totalProfitSum += expectedProfit;
      totalOrderQtySum += recommendedOrder;
      totalOrderCostSum += orderCost;
      
      return {
        'Group': p.group || 'II',
        'Product Name': p.item_name,
        'Total Sold': predictedDemand,
        'Avg Price (₹)': salesPrice.toFixed(2),
        'item_id': p.item_id || 'N/A',
        'category': p.category,
        'current_stock': p.current_stock || 0,
        'purchase_price': purchasePrice.toFixed(2),
        'Demand Cost (₹)': expectedCost.toFixed(2),
        'Predicted Demand Value (₹)': expectedRevenue.toFixed(2),
        'Order Qty': recommendedOrder,
        'Order Cost (₹)': orderCost.toFixed(2),
        'Potential Profit (₹)': expectedProfit.toFixed(2),
        'trend': p.trend || 'stable',
        'growth_rate': `${((p.growth_rate || 0) * 100).toFixed(1)}%`
      };
    });

    dataRows.push({
      'Group': 'TOTAL',
      'Product Name': 'All Products Summary',
      'Total Sold': totalSoldSum,
      'Avg Price (₹)': '',
      'item_id': '',
      'category': '',
      'current_stock': '',
      'purchase_price': '',
      'Demand Cost (₹)': totalCostSum.toFixed(2),
      'Predicted Demand Value (₹)': totalRevenueSum.toFixed(2),
      'Order Qty': totalOrderQtySum,
      'Order Cost (₹)': totalOrderCostSum.toFixed(2),
      'Potential Profit (₹)': totalProfitSum.toFixed(2),
      'trend': '',
      'growth_rate': ''
    });

    const csvRows = [];
    csvRows.push(['--- Product Details ---']);
    const headers = Object.keys(dataRows[0]);
    csvRows.push(headers);
    
    dataRows.forEach(row => {
      csvRows.push(headers.map(h => row[h]));
    });

    // Generate CSV string with proper escaping
    const csvContent = csvRows.map(row => 
      row.map(cell => {
        const str = String(cell).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(',')
    ).join('\n');

    // Add UTF-8 BOM for Excel Rupee symbol support
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Bulk export all analysis data for all products from the backend
   */
  exportFullAnalysisCSV(predictionDate, filters = {}, budget = null, strategy = 'greedy') {
    let url = `${API_BASE_URL}/export-csv?prediction_date=${predictionDate}`;
    
    if (filters.category && filters.category !== 'all') {
      url += `&category=${encodeURIComponent(filters.category)}`;
    }
    
    if (filters.search) {
      url += `&search=${encodeURIComponent(filters.search)}`;
    }

    if (budget && budget > 0) {
      url += `&budget=${budget}&strategy=${encodeURIComponent(strategy)}`;
    }

    console.log("📥 [PREDICTION SERVICE] Triggering bulk export:", url);
    window.open(url, '_blank');
  }
};
