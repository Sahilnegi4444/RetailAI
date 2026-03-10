import axios from "axios";

// Get API URL from localStorage or default to enhanced prediction model
const getApiUrl = () => {
  return localStorage.getItem("apiUrl") || "http://127.0.0.1:8001";
};

const API = getApiUrl();

export const getHistory = async (store, productOrItem) => {
  const res = await axios.get(`${getApiUrl()}/history/${store}/${productOrItem}`);
  return res.data;
};

export const getForecast = async (store, productOrItem, months) => {
  const selectedModel = getSelectedModel();
  
  if (selectedModel === "secondary") {
    // Name-based model
    const res = await axios.post(`${getApiUrl()}/forecast`, {
      item_name: productOrItem,
      months: months
    });
    return res.data;
  } else {
    // Product ID-based model
    const res = await axios.post(`${getApiUrl()}/forecast`, {
      store_id: store,
      product_id: productOrItem,
      months: months
    });
    return res.data;
  }
};

export const getStores = async () => {
  const res = await axios.get(`${getApiUrl()}/stores`);
  return res.data;
};

export const getProducts = async (storeId) => {
  const selectedModel = getSelectedModel();
  
  if (selectedModel === "secondary") {
    // Get items instead of products for name-based model
    const res = await axios.get(`${getApiUrl()}/items`);
    return { store_id: storeId, products: res.data.items || [], model: "secondary" };
  } else {
    const res = await axios.get(`${getApiUrl()}/products/${storeId}`);
    return res.data;
  }
};

export const predictWithContext = async (data) => {
  const res = await axios.post(`${getApiUrl()}/predict_with_context`, data);
  return res.data;
};

export const getBulkPrediction = async (storeId, predictionDate) => {
  const res = await axios.post(`${getApiUrl()}/bulk_predict`, {
    store_id: storeId,
    prediction_date: predictionDate
  });
  return res.data;
};

export const uploadData = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(`${getApiUrl()}/upload_data`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const trainModel = async (storeId) => {
  const res = await axios.post(`${getApiUrl()}/train_model`, {
    store_id: storeId
  });
  return res.data;
};

export const getTrainingStatus = async () => {
  const res = await axios.get(`${getApiUrl()}/training_status`);
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
      features: "3,328 Items • Seasonal Analysis • Trend Detection • Prediction Explanations"
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
