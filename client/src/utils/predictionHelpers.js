/**
 * Helper functions for prediction data processing
 */

/**
 * Safe number conversion - handles NaN, null, undefined
 */
export const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || isNaN(value)) {
    return defaultValue;
  }
  return Number(value);
};

/**
 * Get trend label with emoji
 */
export const getTrendLabel = (trend) => {
  if (trend === 'increasing') return '📈 Increasing';
  if (trend === 'decreasing') return '📉 Decreasing';
  return '➡️ Stable';
};

/**
 * Get trend emoji only
 */
export const getTrendEmoji = (trend) => {
  if (trend === 'increasing') return '📈';
  if (trend === 'decreasing') return '📉';
  return '➡️';
};

/**
 * Get stock status
 */
export const getStockStatus = (currentStock, predictedDemand) => {
  const stock = safeNumber(currentStock);
  const demand = safeNumber(predictedDemand);
  
  if (stock === 0) return { label: 'Out of Stock', class: 'critical', emoji: '🚨' };
  if (stock < demand * 0.5) return { label: 'Critical', class: 'critical', emoji: '🚨' };
  if (stock < demand) return { label: 'Low', class: 'low', emoji: '⚠️' };
  if (stock < demand * 1.5) return { label: 'Adequate', class: 'adequate', emoji: '✅' };
  return { label: 'Excess', class: 'excess', emoji: '📦' };
};

/**
 * Get confidence level
 */
export const getConfidenceLevel = (confidence) => {
  const conf = safeNumber(confidence) * 100;
  
  if (conf >= 90) return { label: 'Very High', class: 'very-high' };
  if (conf >= 80) return { label: 'High', class: 'high' };
  if (conf >= 70) return { label: 'Medium', class: 'medium' };
  if (conf >= 60) return { label: 'Low', class: 'low' };
  return { label: 'Very Low', class: 'very-low' };
};

/**
 * Format month name from number
 */
export const getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || 'Unknown';
};

/**
 * Format short month name
 */
export const getShortMonthName = (monthNumber) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthNumber - 1] || 'N/A';
};

/**
 * Calculate order priority
 */
export const getOrderPriority = (currentStock, predictedDemand, trend) => {
  const stock = safeNumber(currentStock);
  const demand = safeNumber(predictedDemand);
  
  if (stock === 0) return { label: 'Urgent', class: 'urgent', priority: 1 };
  if (stock < demand * 0.5) return { label: 'High', class: 'high', priority: 2 };
  if (stock < demand) return { label: 'Medium', class: 'medium', priority: 3 };
  if (trend === 'increasing' && stock < demand * 1.5) return { label: 'Low', class: 'low', priority: 4 };
  return { label: 'None', class: 'none', priority: 5 };
};

/**
 * Process prediction data for display
 */
export const processPrediction = (prediction) => {
  const finalPrediction = safeNumber(prediction.final_prediction);
  const currentStock = safeNumber(prediction.current_stock);
  const confidence = safeNumber(prediction.confidence);
  const growthRate = safeNumber(prediction.growth_rate);
  const trend = prediction.trend || 'stable';
  
  return {
    ...prediction,
    final_prediction: finalPrediction,
    predicted_demand: finalPrediction,
    current_stock: currentStock,
    confidence: confidence,
    growth_rate: growthRate,
    trend: trend,
    recommended_order: Math.max(0, Math.round(finalPrediction - currentStock)),
    stock_status: getStockStatus(currentStock, finalPrediction),
    confidence_level: getConfidenceLevel(confidence),
    order_priority: getOrderPriority(currentStock, finalPrediction, trend),
    trend_label: getTrendLabel(trend),
    trend_emoji: getTrendEmoji(trend),
  };
};

/**
 * Filter predictions
 */
export const filterPredictions = (predictions, filters) => {
  let filtered = [...predictions];
  
  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(p => 
      p.item_name?.toLowerCase().includes(searchLower)
    );
  }
  
  // Category filter
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(p => p.category === filters.category);
  }
  
  // Stock status filter
  if (filters.stockStatus && filters.stockStatus !== 'all') {
    filtered = filtered.filter(p => p.stock_status.class === filters.stockStatus);
  }
  
  // Trend filter
  if (filters.trend && filters.trend !== 'all') {
    filtered = filtered.filter(p => p.trend === filters.trend);
  }
  
  return filtered;
};

/**
 * Sort predictions
 */
export const sortPredictions = (predictions, sortBy, sortOrder) => {
  const sorted = [...predictions];
  
  sorted.sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'name':
        aVal = a.item_name || '';
        bVal = b.item_name || '';
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      
      case 'demand':
        aVal = a.final_prediction;
        bVal = b.final_prediction;
        break;
      
      case 'stock':
        aVal = a.current_stock;
        bVal = b.current_stock;
        break;
      
      case 'priority':
        aVal = a.order_priority.priority;
        bVal = b.order_priority.priority;
        break;
      
      case 'confidence':
        aVal = a.confidence;
        bVal = b.confidence;
        break;
      
      default:
        return 0;
    }
    
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  return sorted;
};

/**
 * Calculate summary statistics
 */
export const calculateSummary = (predictions) => {
  const totalItems = predictions.length;
  const criticalItems = predictions.filter(p => p.stock_status.class === 'critical').length;
  const lowStockItems = predictions.filter(p => p.stock_status.class === 'low').length;
  const adequateItems = predictions.filter(p => p.stock_status.class === 'adequate').length;
  
  const totalDemand = predictions.reduce((sum, p) => sum + p.final_prediction, 0);
  const totalStock = predictions.reduce((sum, p) => sum + p.current_stock, 0);
  const totalOrderValue = predictions.reduce((sum, p) => {
    const orderQty = Math.max(0, p.final_prediction - p.current_stock);
    const price = safeNumber(p.price);
    return sum + (orderQty * price);
  }, 0);
  
  const increasingTrend = predictions.filter(p => p.trend === 'increasing').length;
  const decreasingTrend = predictions.filter(p => p.trend === 'decreasing').length;
  const stableTrend = predictions.filter(p => p.trend === 'stable').length;
  
  return {
    totalItems,
    criticalItems,
    lowStockItems,
    adequateItems,
    totalDemand: Math.round(totalDemand),
    totalStock: Math.round(totalStock),
    totalOrderValue: Math.round(totalOrderValue),
    increasingTrend,
    decreasingTrend,
    stableTrend,
    avgConfidence: predictions.length > 0 
      ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length 
      : 0,
  };
};
