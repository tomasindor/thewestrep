"use client";

export type ComboAnalyticsEventName = "combo_view" | "combo_add_to_cart" | "combo_discount_applied";

export function trackComboEvent(event: ComboAnalyticsEventName, payload: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  const eventPayload = {
    event,
    ...payload,
  };

  window.dispatchEvent(new CustomEvent("twr:combo-analytics", { detail: eventPayload }));

  const dataLayer = (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push(eventPayload);
  }
}
