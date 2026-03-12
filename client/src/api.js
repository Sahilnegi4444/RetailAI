import axios from "axios";

// API Configuration
// In Docker/Nginx we use /api which proxies to backend
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

console.log("🔧 Using API:", API_BASE_URL);

const getApiUrl = () => {
  return API_BASE_URL;
};

const API = getApiUrl();

export const getHistory = async (store, productOrItem) => {
  const res = await axios.get(`${API}/history/${store}/${productOrItem}`);
  return res.data;
};

export const getForecast = async (store, productOrItem, months) => {
  const selectedModel = getSelectedModel();
  
  if (selectedModel === "secondary") {
    const res = await axios.post(`${API}/forecast`, {
      item_name: productOrItem,
      months: months
    });
    return res.data;
  } else {
    const res = await axios.post(`${API}/forecast`, {
      store_id: store,
      product_id: productOrItem,
      months: months
    });
    return res.data;
  }
};

export const getStores = async () => {
  const res = await axios.get(`${API}/stores`);
  return res.data;
};

export const getProducts = async (storeId) => {
  const selectedModel = getSelectedModel();
  
  if (selectedModel === "secondary") {
    const res = await axios.get(`${API}/items`);
    return { store_id: storeId, products: res.data.items || [], model: "secondary" };
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