import axios from "axios";

export const api = axios.create({
  baseURL: "https://perch-carnation-improving.ngrok-free.dev/api/v1",
  timeout: 100000,
  headers: {
    "Content-Type": "application/json",
  },
});