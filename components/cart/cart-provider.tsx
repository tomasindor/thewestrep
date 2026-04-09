"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { AddCartItemInput, CartCustomerProfile, CartItem } from "@/lib/cart/types";

const STORAGE_KEY = "thewestrep.cart.v2";

interface CartState {
  items: CartItem[];
  customer: CartCustomerProfile;
}

interface CartContextValue {
  customer: CartCustomerProfile;
  hasRequiredCustomerData: boolean;
  hasOptionalCustomerContext: boolean;
  isHydrated: boolean;
  isOpen: boolean;
  itemCount: number;
  items: CartItem[];
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: AddCartItemInput) => void;
  clearCart: () => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateCustomer: (field: keyof CartCustomerProfile, value: string) => void;
}

const initialState: CartState = {
  items: [],
  customer: {
    name: "",
    phone: "",
    email: "",
    cuil: "",
    checkoutMode: "",
    authProvider: "",
    preferredChannel: "",
    customerStatus: "",
    deliveryRecipient: "",
    fulfillment: "",
    location: "",
    notes: "",
  },
};

const CartContext = createContext<CartContextValue | null>(null);

function getCartItemId(item: AddCartItemInput) {
  return [item.productId, item.variantLabel?.trim() ?? "", item.sizeLabel?.trim() ?? ""].join("::");
}

function getLegacyContactFields(contact: unknown) {
  const normalizedContact = typeof contact === "string" ? contact.trim() : "";

  if (!normalizedContact) {
    return { phone: "", email: "" };
  }

  if (normalizedContact.includes("@")) {
    return { phone: "", email: normalizedContact };
  }

  return { phone: normalizedContact, email: "" };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(initialState);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);

      if (storedValue) {
        const parsedValue = JSON.parse(storedValue) as Partial<CartState>;
        const customerData = parsedValue.customer as (Partial<CartCustomerProfile> & { contact?: string }) | undefined;
        const legacyContactFields = getLegacyContactFields(customerData?.contact);

        setState({
          items: Array.isArray(parsedValue.items) ? parsedValue.items : [],
          customer: {
            ...legacyContactFields,
            name: customerData?.name ?? "",
            phone: customerData?.phone ?? legacyContactFields.phone,
            email: customerData?.email ?? legacyContactFields.email,
            cuil: customerData?.cuil ?? "",
            checkoutMode:
              customerData?.checkoutMode === "account"
                ? "account"
                : customerData?.checkoutMode === "guest"
                  ? "guest"
                  : "",
            authProvider:
              customerData?.authProvider === "google" || customerData?.authProvider === "credentials"
                ? customerData.authProvider
                : "",
            preferredChannel: customerData?.preferredChannel ?? "",
            customerStatus: customerData?.customerStatus ?? "",
            deliveryRecipient: customerData?.deliveryRecipient ?? "",
            fulfillment:
              customerData?.fulfillment === "envio-caba-gba" || customerData?.fulfillment === "envio-interior"
                ? customerData.fulfillment
                : "",
            location: customerData?.location ?? "",
            notes: customerData?.notes ?? "",
          },
        });
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isHydrated, state]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = state.items.reduce((total, item) => total + item.quantity, 0);

    return {
      items: state.items,
      customer: state.customer,
      isOpen,
      isHydrated,
      itemCount,
      hasRequiredCustomerData: Boolean(state.customer.name.trim() && state.customer.phone.trim() && state.customer.email.trim()),
      hasOptionalCustomerContext: Boolean(
        state.customer.cuil.trim() ||
          state.customer.preferredChannel ||
          state.customer.customerStatus ||
          state.customer.deliveryRecipient.trim() ||
          state.customer.fulfillment ||
          state.customer.location.trim() ||
          state.customer.notes.trim(),
      ),
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: (item) => {
        const itemId = getCartItemId(item);

        setState((currentState) => {
          const existingItem = currentState.items.find((entry) => entry.id === itemId);

          if (existingItem) {
            return {
              ...currentState,
              items: currentState.items.map((entry) =>
                entry.id === itemId ? { ...entry, quantity: entry.quantity + 1 } : entry,
              ),
            };
          }

          return {
            ...currentState,
            items: [
              ...currentState.items,
              {
                ...item,
                id: itemId,
                variantLabel: item.variantLabel?.trim() || undefined,
                sizeLabel: item.sizeLabel?.trim() || undefined,
                quantity: 1,
              },
            ],
          };
        });

        setIsOpen(true);
      },
      clearCart: () => {
        setState((currentState) => ({
          ...currentState,
          items: [],
        }));
      },
      removeItem: (itemId) => {
        setState((currentState) => ({
          ...currentState,
          items: currentState.items.filter((entry) => entry.id !== itemId),
        }));
      },
      updateQuantity: (itemId, quantity) => {
        setState((currentState) => ({
          ...currentState,
          items:
            quantity <= 0
              ? currentState.items.filter((entry) => entry.id !== itemId)
              : currentState.items.map((entry) => (entry.id === itemId ? { ...entry, quantity } : entry)),
        }));
      },
      updateCustomer: (field, value) => {
        setState((currentState) => ({
          ...currentState,
          customer: {
            ...currentState.customer,
            [field]: value,
          },
        }));
      },
    };
  }, [isHydrated, isOpen, state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
