import axios, { type AxiosInstance } from "axios";
import { addBasePrivateInterceptors } from "./interceptor";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/** Public Axios Instance */
export const axiosHttp: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/** Private Axios Instance (with auth interceptors) */
export const axiosHttpPrivate: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach private request & response interceptors
addBasePrivateInterceptors(axiosHttpPrivate);