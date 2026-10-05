"use client";

import useSWRMutation from "swr/mutation";
import { createPOSOrder } from "../services";
import { POSCreateOrderSubmitValues, POSCreateOrderResponse } from "../usecases/pos";

async function postOrderFetcher(
  _key: string,
  { arg }: { arg: POSCreateOrderSubmitValues }
): Promise<POSCreateOrderResponse | undefined> {
  const response = await createPOSOrder(arg);
  return response ?? undefined;
}

export function useCreateOrder() {
  const { trigger, isMutating, error, reset } = useSWRMutation(
    "/checkout",
    postOrderFetcher
  );

  const createOrder = async (payload: POSCreateOrderSubmitValues) => {
    try {
      const response = await trigger(payload);
      return response;
    } catch (err) {
      console.error("Failed to create order:", err);
      return undefined;
    }
  };

  return {
    createOrder,
    isSubmitting: isMutating,
    error,
    reset,
  };
}