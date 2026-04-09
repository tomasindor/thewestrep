"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { CheckoutAccessCustomerAuthState } from "@/components/cart/checkout-access-step";
import type { CustomerProfileSnapshot } from "@/lib/auth/customer-profile";
import { useCart } from "@/components/cart/cart-provider";
import {
  getFulfillmentCopy,
  getSavedShippingSummary,
  getPriceAmount,
} from "@/lib/orders/checkout.shared";
import { hasEncargueItems, getCorreoArgentinoFeeTotal } from "@/lib/cart/assisted-orders";

interface SubmittedOrder {
  authProvider: "guest" | "credentials" | "google";
  checkoutMode: "guest" | "account";
  customerAccountId: string | null;
  payment: {
    checkoutUrl: string;
    externalReference: string;
    preferenceId: string;
    provider: "mercadopago";
    sandboxCheckoutUrl: string | null;
  } | null;
  paymentError: string | null;
  reference: string;
  totalAmountArs: number;
}

export interface CheckoutControllerReturn {
  // State
  hasTriedSubmit: boolean;
  submitError: string | null;
  isSubmittingOrder: boolean;
  submittedOrder: SubmittedOrder | null;
  acceptedAssistedOrderSignature: string;
  checkedAssistedOrderSignature: string;

  // Computed
  subtotal: number;
  shippingFee: number;
  correoArgentinoFeeTotal: number;
  total: number;
  hasRequiredFields: boolean;
  hasEncargueOrder: boolean;
  hasResolvedAccess: boolean;
  assistedOrderSignature: string;
  savedShippingSummary: string;
  requiresAssistedOrderAcknowledgement: boolean;
  isSubmitted: boolean;

  // Callbacks
  placeOrder: () => void;
  markTriedSubmit: () => void;
  acceptAssistedOrder: () => void;
  checkAssistedOrderTerms: (checked: boolean, signature: string) => void;
}

export function useCheckoutController(
  customerAuth: CheckoutAccessCustomerAuthState | null,
  customerProfile: CustomerProfileSnapshot | null,
): CheckoutControllerReturn {
  const { customer, items, updateCustomer } = useCart();
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [acceptedAssistedOrderSignature, setAcceptedAssistedOrderSignature] = useState("");
  const [checkedAssistedOrderSignature, setCheckedAssistedOrderSignature] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(null);
  const [isSubmittingOrder, startSubmittingOrder] = useTransition();
  const hydratedAuthIdentityRef = useRef<string | null>(null);

  const hasEncargueOrder = hasEncargueItems(items);
  const correoArgentinoFeeTotal = getCorreoArgentinoFeeTotal(items);
  const assistedOrderSignature = useMemo(
    () =>
      items
        .filter((item) => item.availability === "encargue")
        .map((item) => item.id)
        .join("|"),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + getPriceAmount(item.priceDisplay) * item.quantity, 0),
    [items],
  );
  const shippingFee = getFulfillmentCopy(customer.fulfillment)?.fee ?? 0;
  const total = subtotal + shippingFee + correoArgentinoFeeTotal;
  const requiredLocation = customer.location.trim();
  const hasRequiredFields = Boolean(
    customer.name.trim() && customer.phone.trim() && customer.email.trim() && customer.fulfillment && requiredLocation,
  );
  const hasAcceptedAssistedOrderTerms = !hasEncargueOrder || acceptedAssistedOrderSignature === assistedOrderSignature;
  const hasCheckedAssistedOrderTerms = checkedAssistedOrderSignature === assistedOrderSignature;
  const requiresAssistedOrderAcknowledgement = hasEncargueOrder && !hasAcceptedAssistedOrderTerms;
  const isSubmitted = Boolean(submittedOrder);
  const authIdentityKey = customerAuth ? `${customerAuth.authProvider}:${customerAuth.email}` : null;
  const hasResolvedAccess = customer.checkoutMode === "guest" || Boolean(customerAuth);
  const savedShippingSummary = useMemo(() => getSavedShippingSummary(customerProfile), [customerProfile]);

  // Auth sync effect: customer profile prefill + auth state reconciliation
  useEffect(() => {
    if (!customerAuth) {
      hydratedAuthIdentityRef.current = null;

      if (customer.checkoutMode !== "account") {
        if (customer.authProvider !== "") {
          updateCustomer("authProvider", "");
        }

        return;
      }

      return;
    }

    if (customer.checkoutMode !== "account") {
      updateCustomer("checkoutMode", "account");
    }

    if (customer.authProvider !== customerAuth.authProvider) {
      updateCustomer("authProvider", customerAuth.authProvider);
    }

    if (hydratedAuthIdentityRef.current === authIdentityKey) {
      return;
    }

    hydratedAuthIdentityRef.current = authIdentityKey;

    if (customerAuth.email) {
      updateCustomer("email", customerAuth.email);
    }

    updateCustomer("name", customerProfile?.name || customerAuth.name || customer.name);

    if (customerProfile?.phone) {
      updateCustomer("phone", customerProfile.phone);
    }

    if (customerProfile?.cuil) {
      updateCustomer("cuil", customerProfile.cuil);
    }

    if (customerProfile?.shippingRecipient) {
      updateCustomer("deliveryRecipient", customerProfile.shippingRecipient);
    } else if (!customer.deliveryRecipient.trim()) {
      updateCustomer("deliveryRecipient", customerProfile?.name || customerAuth.name || customer.name);
    }

    if (customerProfile?.preferredChannel) {
      updateCustomer("preferredChannel", customerProfile.preferredChannel);
    } else if (!customer.preferredChannel) {
      updateCustomer("preferredChannel", "email");
    }

    if (savedShippingSummary) {
      updateCustomer("location", savedShippingSummary);
    }

    if (customerProfile?.shippingDeliveryNotes) {
      updateCustomer("notes", customerProfile.shippingDeliveryNotes);
    }
  }, [
    authIdentityKey,
    customer.authProvider,
    customer.checkoutMode,
    customer.deliveryRecipient,
    customer.name,
    customer.preferredChannel,
    customerAuth,
    customerProfile,
    savedShippingSummary,
    updateCustomer,
  ]);

  // Secondary auth sync effect: prefill from profile when fields are empty
  useEffect(() => {
    if (!customerProfile) {
      return;
    }

    if (!customer.name.trim() && customerProfile.name) {
      updateCustomer("name", customerProfile.name);
    }

    if (!customer.email.trim() && customerProfile.email) {
      updateCustomer("email", customerProfile.email);
    }

    if (!customer.phone.trim() && customerProfile.phone) {
      updateCustomer("phone", customerProfile.phone);
    }

    if (!customer.cuil.trim() && customerProfile.cuil) {
      updateCustomer("cuil", customerProfile.cuil);
    }

    if (!customer.deliveryRecipient.trim() && customerProfile.shippingRecipient) {
      updateCustomer("deliveryRecipient", customerProfile.shippingRecipient);
    }

    if (!customer.preferredChannel && customerProfile.preferredChannel) {
      updateCustomer("preferredChannel", customerProfile.preferredChannel);
    }

    if (!customer.location.trim() && savedShippingSummary) {
      updateCustomer("location", savedShippingSummary);
    }

    if (!customer.notes.trim() && customerProfile.shippingDeliveryNotes) {
      updateCustomer("notes", customerProfile.shippingDeliveryNotes);
    }
  }, [
    customer.cuil,
    customer.deliveryRecipient,
    customer.email,
    customer.location,
    customer.name,
    customer.notes,
    customer.phone,
    customer.preferredChannel,
    customerProfile,
    savedShippingSummary,
    updateCustomer,
  ]);

  // Order submission
  const placeOrder = () => {
    setSubmitError(null);

    if (!hasRequiredFields || requiresAssistedOrderAcknowledgement) {
      return;
    }

    startSubmittingOrder(async () => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, items }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            order?: {
              authProvider: "guest" | "credentials" | "google";
              checkoutMode: "guest" | "account";
              customerAccountId: string | null;
              reference: string;
              totalAmountArs: number;
            };
            payment?: {
              checkoutUrl: string;
              externalReference: string;
              preferenceId: string;
              provider: "mercadopago";
              sandboxCheckoutUrl: string | null;
            } | null;
            paymentError?: string | null;
          }
        | null;

      if (!response.ok || !payload?.order) {
        setSubmitError(payload?.error ?? "No pudimos guardar tu pedido ahora.");
        return;
      }

      setSubmittedOrder({
        ...payload.order,
        payment: payload.payment ?? null,
        paymentError: payload.paymentError ?? null,
      });
    });
  };

  const markTriedSubmit = () => {
    setHasTriedSubmit(true);
  };

  const acceptAssistedOrder = () => {
    setAcceptedAssistedOrderSignature(assistedOrderSignature);
  };

  const checkAssistedOrderTerms = (checked: boolean, signature: string) => {
    setCheckedAssistedOrderSignature(checked ? signature : "");
  };

  return {
    // State
    hasTriedSubmit,
    submitError,
    isSubmittingOrder,
    submittedOrder,
    acceptedAssistedOrderSignature,
    checkedAssistedOrderSignature,

    // Computed
    subtotal,
    shippingFee,
    correoArgentinoFeeTotal,
    total,
    hasRequiredFields,
    hasEncargueOrder,
    hasResolvedAccess,
    assistedOrderSignature,
    savedShippingSummary,
    requiresAssistedOrderAcknowledgement,
    isSubmitted,

    // Callbacks
    placeOrder,
    markTriedSubmit,
    acceptAssistedOrder,
    checkAssistedOrderTerms,
  };
}
