"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import {
  CART_STORAGE_KEY,
  SAVED_FOR_LATER_STORAGE_KEY,
  type CartItem,
  createCartItemId,
  getCartTotals,
  normalizeCartItems,
} from "@/lib/cart-types";

type AddCartItemInput = Omit<CartItem, "id" | "quantity"> & {
  id?: string;
  quantity?: number;
};

type CartState = {
  items: CartItem[];
  isDrawerOpen: boolean;
  isReady: boolean;
};

type CartAction =
  | { type: "ADD_ITEM"; item: AddCartItemInput }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "UPDATE_QTY"; id: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "RESTORE_CART"; items: CartItem[] }
  | { type: "OPEN_DRAWER" }
  | { type: "CLOSE_DRAWER" }
  | { type: "TOGGLE_DRAWER" };

type CartContextValue = {
  items: CartItem[];
  cartCount: number;
  subtotal: number;
  estimatedTax: number;
  isDrawerOpen: boolean;
  isReady: boolean;
  addItem: (item: AddCartItemInput) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  saveForLater: (id: string) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

const initialState: CartState = {
  items: [],
  isDrawerOpen: false,
  isReady: false,
};

const CartContext = createContext<CartContextValue | null>(null);

function clampQuantity(quantity: number, stock?: number | null) {
  const cleanQuantity = Math.max(1, Math.floor(quantity));

  if (typeof stock === "number") {
    return Math.min(cleanQuantity, Math.max(1, stock));
  }

  return cleanQuantity;
}

function mergeCartItems(primary: CartItem[], incoming: CartItem[]) {
  const merged = new Map<string, CartItem>();

  [...primary, ...incoming].forEach((item) => {
    const existing = merged.get(item.id);

    if (!existing) {
      merged.set(item.id, {
        ...item,
        quantity: clampQuantity(item.quantity, item.stock),
      });
      return;
    }

    merged.set(item.id, {
      ...existing,
      quantity: clampQuantity(existing.quantity + item.quantity, existing.stock),
    });
  });

  return Array.from(merged.values());
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const itemId =
        action.item.id ??
        createCartItemId(action.item.productId, action.item.variantId);
      const quantity = clampQuantity(action.item.quantity ?? 1, action.item.stock);
      const existingItem = state.items.find((item) => item.id === itemId);

      if (existingItem) {
        return {
          ...state,
          isDrawerOpen: true,
          items: state.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantity: clampQuantity(
                    item.quantity + quantity,
                    item.stock ?? action.item.stock
                  ),
                }
              : item
          ),
        };
      }

      return {
        ...state,
        isDrawerOpen: true,
        items: [
          ...state.items,
          {
            ...action.item,
            id: itemId,
            quantity,
          },
        ],
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.id),
      };
    case "UPDATE_QTY":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id
            ? {
                ...item,
                quantity: clampQuantity(action.quantity, item.stock),
              }
            : item
        ),
      };
    case "CLEAR_CART":
      return {
        ...state,
        items: [],
      };
    case "RESTORE_CART":
      return {
        ...state,
        items: normalizeCartItems(action.items),
        isReady: true,
      };
    case "OPEN_DRAWER":
      return {
        ...state,
        isDrawerOpen: true,
      };
    case "CLOSE_DRAWER":
      return {
        ...state,
        isDrawerOpen: false,
      };
    case "TOGGLE_DRAWER":
      return {
        ...state,
        isDrawerOpen: !state.isDrawerOpen,
      };
    default:
      return state;
  }
}

function readGuestCart() {
  try {
    return normalizeCartItems(
      JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]")
    );
  } catch {
    return [];
  }
}

function writeGuestCart(items: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

async function loadUserCart() {
  const response = await fetch("/api/cart", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as { items?: unknown };
  return normalizeCartItems(payload.items ?? []);
}

async function saveUserCart(items: CartItem[]) {
  const response = await fetch("/api/cart", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) return items;

  const payload = (await response.json()) as { items?: unknown };
  return normalizeCartItems(payload.items ?? items);
}

export function CartProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string | null;
}) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const didRestoreRef = useRef(false);

  useEffect(() => {
    let isActive = true;
    didRestoreRef.current = false;

    async function restoreCart() {
      const guestItems = readGuestCart();

      if (!userId) {
        if (isActive) {
          dispatch({ type: "RESTORE_CART", items: guestItems });
        }
        return;
      }

      try {
        const dbItems = await loadUserCart();
        const mergedItems = mergeCartItems(dbItems, guestItems);
        const savedItems = await saveUserCart(mergedItems);

        if (guestItems.length) {
          window.localStorage.removeItem(CART_STORAGE_KEY);
        }

        if (isActive) {
          dispatch({ type: "RESTORE_CART", items: savedItems });
        }
      } catch {
        if (isActive) {
          dispatch({ type: "RESTORE_CART", items: guestItems });
        }
      }
    }

    restoreCart().then(() => {
      didRestoreRef.current = true;
    });

    return () => {
      isActive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!state.isReady || !didRestoreRef.current) return;

    if (!userId) {
      writeGuestCart(state.items);
      return;
    }

    const timeout = window.setTimeout(() => {
      saveUserCart(state.items).catch(() => undefined);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [state.items, state.isReady, userId]);

  const addItem = useCallback((item: AddCartItemInput) => {
    dispatch({ type: "ADD_ITEM", item });
  }, []);

  const removeItem = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ITEM", id });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    dispatch({ type: "UPDATE_QTY", id, quantity });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const saveForLater = useCallback(
    (id: string) => {
      const item = state.items.find((cartItem) => cartItem.id === id);
      if (!item) return;

      const savedItems = normalizeCartItems(
        JSON.parse(window.localStorage.getItem(SAVED_FOR_LATER_STORAGE_KEY) ?? "[]")
      );
      const nextSavedItems = mergeCartItems(savedItems, [{ ...item, quantity: 1 }]);

      window.localStorage.setItem(
        SAVED_FOR_LATER_STORAGE_KEY,
        JSON.stringify(nextSavedItems)
      );
      dispatch({ type: "REMOVE_ITEM", id });
    },
    [state.items]
  );

  const openCart = useCallback(() => {
    dispatch({ type: "OPEN_DRAWER" });
  }, []);

  const closeCart = useCallback(() => {
    dispatch({ type: "CLOSE_DRAWER" });
  }, []);

  const toggleCart = useCallback(() => {
    dispatch({ type: "TOGGLE_DRAWER" });
  }, []);

  const value = useMemo(() => {
    const totals = getCartTotals(state.items);

    return {
      items: state.items,
      cartCount: totals.itemCount,
      subtotal: totals.subtotal,
      estimatedTax: totals.estimatedTax,
      isDrawerOpen: state.isDrawerOpen,
      isReady: state.isReady,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      saveForLater,
      openCart,
      closeCart,
      toggleCart,
    };
  }, [
    state.items,
    state.isDrawerOpen,
    state.isReady,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    saveForLater,
    openCart,
    closeCart,
    toggleCart,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
