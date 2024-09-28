import { ResponseType } from "@tauri-apps/api/http";
import localforage from "localforage";

const baseUrl = "https://finance.yahoo.com";

// Return an object for Yahoo Finance API request holding the url and fetch() request options
const yahooFinanceAPI = {
  url: baseUrl + "/quote/",
  options: {
    method: "get",
    responseType: ResponseType.JSON,
  },
};

// Function to fetch stock data from Yahoo Finance API
async function fetchStockData(stockSymbol) {
  const response = await fetch(yahooFinanceAPI.url + stockSymbol, yahooFinanceAPI.options);
  if (!response.ok) {
    throw new Error(`Error fetching stock data: ${response.statusText}`);
  }
  return response.data;
}

// Function to store stock data in IndexedDB using localforage
async function storeStockData(stockSymbol, stockData) {
  const stockStore = localforage.createInstance({
    name: "stoqster",
    storeName: "stocks",
  });
  await stockStore.setItem(stockSymbol, stockData);
}

// Function to get stock data from IndexedDB using localforage
async function getStoredStockData(stockSymbol) {
  const stockStore = localforage.createInstance({
    name: "stoqster",
    storeName: "stocks",
  });
  return await stockStore.getItem(stockSymbol);
}

export { fetchStockData, storeStockData, getStoredStockData };
