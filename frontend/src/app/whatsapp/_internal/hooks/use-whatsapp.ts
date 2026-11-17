"use client";

import { useState } from "react";
import { axiosHttpPrivate, useSWRPrivateRequest } from "@/main/lib/axios";

export interface WhatsAppStatusData {
  provider: string;
  openwa_base_url: string;
  openwa_connected: boolean;
  detail: string;
  gemini_configured: boolean;
  gemini_model: string;
  delivery_mode: string;
}

export interface WhatsAppSessionData {
  id: string;
  phone_number: string;
  customer_name?: string | null;
  state: string;
  draft_cart: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    item_notes?: string | null;
  }>;
  delivery_address?: string | null;
  selected_provider?: string | null;
  quoted_delivery_fee: number;
  payment_method?: string | null;
  last_order_id?: string | null;
  updated_at: string;
}

export interface WhatsAppMessageData {
  id: string;
  direction: "inbound" | "outbound";
  message_text: string;
  wa_message_id?: string | null;
  created_at: string;
}

export interface WhatsAppSimulateResult {
  session: WhatsAppSessionData;
  reply_text: string;
  intent: string;
  order_id?: string | null;
  daily_order_number?: number | null;
}

export function useWhatsAppAdmin(selectedSessionId: string | null) {
  const [isSending, setIsSending] = useState(false);

  const { data: statusRes, mutate: refreshStatus } =
    useSWRPrivateRequest<WhatsAppStatusData>({ url: "/whatsapp/status" });

  const {
    data: sessionsRes,
    isLoading: isLoadingSessions,
    mutate: refreshSessions,
  } = useSWRPrivateRequest<WhatsAppSessionData[]>(
    { url: "/whatsapp/sessions" },
    { refreshInterval: 10000 }
  );

  const {
    data: messagesRes,
    isLoading: isLoadingMessages,
    mutate: refreshMessages,
  } = useSWRPrivateRequest<WhatsAppMessageData[]>(
    selectedSessionId
      ? { url: `/whatsapp/sessions/${selectedSessionId}/messages` }
      : null,
    { refreshInterval: 8000 }
  );

  const sendSimulatedMessage = async (
    phoneNumber: string,
    customerName: string,
    message: string
  ) => {
    setIsSending(true);
    try {
      const res = await axiosHttpPrivate.post<WhatsAppSimulateResult>(
        "/whatsapp/simulate",
        {
          phone_number: phoneNumber,
          customer_name: customerName,
          message,
        }
      );
      await refreshSessions();
      await refreshMessages();
      return res.data;
    } finally {
      setIsSending(false);
    }
  };

  const simulateDeliveryWebhook = async (orderId: string, status: string) => {
    const res = await axiosHttpPrivate.post("/delivery/webhook", {
      order_id: orderId,
      status,
    });
    return res.data;
  };

  return {
    status: statusRes?.data,
    sessions: sessionsRes?.data || [],
    messages: messagesRes?.data || [],
    isLoadingSessions,
    isLoadingMessages,
    isSending,
    refreshStatus,
    refreshSessions,
    refreshMessages,
    sendSimulatedMessage,
    simulateDeliveryWebhook,
  };
}
