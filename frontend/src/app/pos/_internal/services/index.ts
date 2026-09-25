import { axiosHttpPrivate } from "@/main/lib/axios";
import {
  POSCreateOrderSubmitValues,
  POSCreateOrderResponse,
} from "../usecases/pos";

export const createPOSOrder = async (
  payload: POSCreateOrderSubmitValues
): Promise<POSCreateOrderResponse | void> => {
  try {
    const response = await axiosHttpPrivate.post<POSCreateOrderResponse>(
      "/orders",
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};