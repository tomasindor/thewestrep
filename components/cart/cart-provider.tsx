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
    contact: "",
    preferredChannel: "",
    customerStatus: "",
    fulfillment: "",
    location: "",
    notes: "",
  },
};

const CartContext = createContext<CartContextValue | null>(null);

function getCartItemId(item: AddCartItemInput) {
  return [item.productId, item.variantLabel?.trim() ?? "", item.sizeLabel?.trim() ?? ""].join("::");
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

        setState({
          items: Array.isArray(parsedValue.items) ? parsedValue.items : [],
          customer: {
            name: parsedValue.customer?.name ?? "",
            contact: parsedValue.customer?.contact ?? "",
            preferredChannel: parsedValue.customer?.preferredChannel ?? "",
            customerStatus: parsedValue.customer?.customerStatus ?? "",
            fulfillment: parsedValue.customer?.fulfillment ?? "",
            location: parsedValue.customer?.location ?? "",
            notes: parsedValue.customer?.notes ?? "",
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
      hasRequiredCustomerData: Boolean(state.customer.name.trim() && state.customer.contact.trim()),
      hasOptionalCustomerContext: Boolean(
        state.customer.preferredChannel ||
          state.customer.customerStatus ||
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
