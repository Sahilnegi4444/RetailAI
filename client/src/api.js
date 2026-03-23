import axios from "axios";

// API Configuration
// For local development: http://localhost:8001
// For Docker/Nginx: /api (proxies to backend)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

console.log("🔧 [API CONFIG] Base URL:", API_BASE_URL);
console.log("🔧 [API CONFIG] Environment:", import.meta.env.MODE);
console.log("🔧 [API CONFIG] VITE_API_URL:", import.meta.env.VITE_API_URL);

const getApiUrl = () => {
  console.log("🔧 [API] Returning API URL:", API_BASE_URL);
  return API_BASE_URL;
};

const API = getApiUrl();

// Add request interceptor for debugging
axios.interceptors.request.use(
  (config) => {
    console.log(`🚀 [API REQUEST] ${config.method?.toUpperCase()} ${config.url}`, {
      baseURL: config.baseURL,
      fullURL: `${config.baseURL || ''}${config.url}`,
      data: config.data,
      params: config.params
    });
    return config;
  },
  (error) => {
    console.error("❌ [API REQUEST ERROR]", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
axios.interceptors.response.use(
  (response) => {
    console.log(`✅ [API RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      statusText: response.statusText,
      dataSize: JSON.stringify(response.data).length,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error(`❌ [API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export const getHistory = async (store, productOrItem) => {
  const res = await axios.get(`${API}/history/${store}/${productOrItem}`);
  // Return the history array if it exists, otherwise return empty array
  if (res.data && res.data.history && Array.isArray(res.data.history)) {
    return res.data.history;
  }
  return [];
};

export const getForecast = async (store, productOrItem, months) => {
  const selectedModel = getSelectedModel();
  
  try {
    if (selectedModel === "secondary") {
      const res = await axios.post(`${API}/forecast`, {
        item_name: productOrItem,
        months: months
      });
      // Ensure we return an array
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } else {
      const res = await axios.post(`${API}/forecast`, {
        store_id: store,
        product_id: productOrItem,
        months: months
      });
      // Ensure we return an array
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    }
  } catch (error) {
    console.error("Error fetching forecast:", error);
    return [];
  }
};

export const getStores = async () => {
  const res = await axios.get(`${API}/stores`);
  return res.data;
};

export const getProducts = async (storeId) => {
  const selectedModel = getSelectedModel();
  
  console.log("🔍 [API] getProducts called with storeId:", storeId, "model:", selectedModel);
  
  if (selectedModel === "secondary") {
    const res = await axios.get(`${API}/items`);
    console.log("✅ [API] Items response:", res.data);
    
    // Return the full response with grocery and liquor data
    return { 
      store_id: storeId, 
      grocery: res.data.grocery,
      liquor: res.data.liquor,
      summary: res.data.summary,
      model: "secondary" 
    };
  } else {
    const res = await axios.get(`${API}/products/${storeId}`);
    return res.data;
  }
};

export const predictWithContext = async (data) => {
  const res = await axios.post(`${API}/predict_with_context`, data);
  return res.data;
};

export const getBulkPrediction = async (storeId, predictionDate) => {
  const res = await axios.post(`${API}/bulk_predict`, {
    store_id: storeId,
    prediction_date: predictionDate
  });
  return res.data;
};

export const uploadData = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post(`${API}/upload_data`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const trainModel = async (storeId) => {
  const res = await axios.post(`${API}/train_model`, {
    store_id: storeId
  });
  return res.data;
};

export const getTrainingStatus = async () => {
  const res = await axios.get(`${API}/training_status`);
  return res.data;
};

export const getSelectedModel = () => {
  return localStorage.getItem("selectedModel") || "secondary";
};

export const getModelInfo = () => {
  const model = getSelectedModel();

  if (model === "secondary") {
    return {
      name: "Enhanced Prediction System",
      type: "Individual Item Analysis",
      accuracy: "90.5%",
      port: 8001,
      approach: "Enhanced Pattern Recognition",
      features:
        "3,328 Items • Seasonal Analysis • Trend Detection • Prediction Explanations"
    };
  }

  return {
    name: "Primary Model",
    type: "General Retail",
    accuracy: "87.12%",
    port: 8000,
    approach: "Product ID-based"
  };
};

// Get expected data format
export const getDataFormat = async () => {
  const res = await axios.get(`${API}/data_format`);
  return res.data;
};

// Upload monthly data
export const uploadMonthlyData = async (file, year, month, category) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("year", String(year));
  formData.append("month", String(month));
  formData.append("category", category);

  console.log("📤 Uploading file:", {
    filename: file.name,
    size: file.size,
    year,
    month,
    category,
    url: `${API}/upload_monthly_data`
  });

  try {
    // Create axios instance without interceptors for this request
    const instance = axios.create();
    
    const res = await instance.post(`${API}/upload_monthly_data`, formData);
    
    console.log("✅ Upload response:", res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Upload error:", error);
    throw error;
  }
};

// Update stock levels
export const updateStock = async (updates) => {
  const res = await axios.post(`${API}/update_stock`, {
    updates: updates
  });
  return res.data;
};

// Retrain model with latest data
export const retrainModel = async () => {
  const res = await axios.post(`${API}/retrain_model`);
  return res.data;
};