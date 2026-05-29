"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Home,
  Loader2,
  MapPin,
  PackageCheck,
  QrCode,
  Radio,
  RefreshCw,
  Smartphone,
  Truck,
} from "lucide-react";

import { useCart } from "@/lib/cart-context";

export type CheckoutAddress = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type CheckoutFlowProps = {
  savedAddresses: CheckoutAddress[];
  user: {
    name: string;
    email: string;
    phone: string;
  };
};

type CheckoutStep = "address" | "delivery" | "payment" | "review" | "confirm";
type DeliveryOptionId = "standard" | "express" | "same-day";
type PaymentTab = "online" | "upi";

type AddressFormState = {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type ConfirmedOrder = {
  id: string;
  estimatedDelivery: string | null;
  total: number;
  items: Array<{
    id: string;
    name: string;
    imageUrl: string;
    quantity: number;
    total: number;
  }>;
};

type ApiOrderItem = {
  id?: string;
  qty?: number;
  totalPrice?: number;
  product?: {
    title?: string;
    images?: Array<{ url?: string }>;
  };
};

type ApiOrder = {
  id?: string;
  estimatedDelivery?: string | null;
  total?: number;
  items?: ApiOrderItem[];
};

type PaymentOrder = ConfirmedOrder & {
  paymentStartedAt: string;
};

type OnlinePaymentStatus = "idle" | "creating" | "verifying" | "error";

type QrPaymentState = {
  orderId: string | null;
  qrId: string | null;
  imageUrl: string | null;
  expiresAt: string | null;
  status: "idle" | "loading" | "pending" | "paid" | "expired" | "error";
  error: string | null;
};

type CheckoutState = {
  step: CheckoutStep;
  selectedAddressId: string | null;
  draftAddress: AddressFormState;
  customAddresses: CheckoutAddress[];
  deliveryOption: DeliveryOptionId;
  paymentTab: PaymentTab;
  confirmedOrder: ConfirmedOrder | null;
};

const CHECKOUT_STORAGE_KEY = "ecom_checkout_state";
const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80";
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const CHECKOUT_STEPS: Array<{ id: CheckoutStep; label: string }> = [
  { id: "address", label: "Address" },
  { id: "delivery", label: "Delivery" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
  { id: "confirm", label: "Confirm" },
];

const PINCODE_HINTS: Record<string, { city: string; state: string }> = {
  "11": { city: "New Delhi", state: "Delhi" },
  "12": { city: "Gurugram", state: "Haryana" },
  "40": { city: "Mumbai", state: "Maharashtra" },
  "41": { city: "Pune", state: "Maharashtra" },
  "56": { city: "Bengaluru", state: "Karnataka" },
  "57": { city: "Mysuru", state: "Karnataka" },
  "60": { city: "Chennai", state: "Tamil Nadu" },
  "70": { city: "Kolkata", state: "West Bengal" },
};

const SAME_DAY_PIN_PREFIXES = ["11", "40", "56", "60", "70"];

const emptyAddressForm: AddressFormState = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

const emptyQrPaymentState: QrPaymentState = {
  orderId: null,
  qrId: null,
  imageUrl: null,
  expiresAt: null,
  status: "idle",
  error: null,
};

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: {
    description?: string;
    reason?: string;
  };
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpaySuccessResponse) => void;
  modal: {
    ondismiss: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailureResponse) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

function mapConfirmedOrder(
  order: ApiOrder,
  fallbackItems: ReturnType<typeof useCart>["items"],
  fallbackTotal: number,
  fallbackEstimatedDelivery: string | null
): ConfirmedOrder {
  return {
    id: order.id ?? "",
    estimatedDelivery: order.estimatedDelivery ?? fallbackEstimatedDelivery,
    total: typeof order.total === "number" ? order.total : fallbackTotal,
    items: Array.isArray(order.items)
      ? order.items.map((item, index) => ({
          id: item.id ?? `${order.id ?? "order"}-${index}`,
          name: item.product?.title ?? fallbackItems[index]?.name ?? "Item",
          imageUrl:
            item.product?.images?.[0]?.url ??
            fallbackItems[index]?.imageUrl ??
            FALLBACK_PRODUCT_IMAGE,
          quantity: item.qty ?? fallbackItems[index]?.quantity ?? 1,
          total:
            typeof item.totalPrice === "number"
              ? item.totalPrice
              : (fallbackItems[index]?.unitPrice ?? 0) *
                (fallbackItems[index]?.quantity ?? 1),
        }))
      : fallbackItems.map((item) => ({
          id: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          total: item.unitPrice * item.quantity,
        })),
  };
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SRC}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function getPincodeHint(pincode: string) {
  return PINCODE_HINTS[pincode.slice(0, 2)] ?? null;
}

function isPincodeServiceableForSameDay(pincode: string) {
  return SAME_DAY_PIN_PREFIXES.includes(pincode.slice(0, 2));
}

function getInitialState(savedAddresses: CheckoutAddress[]): CheckoutState {
  const defaultAddress =
    savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0];

  return {
    step: "address",
    selectedAddressId: defaultAddress?.id ?? null,
    draftAddress: emptyAddressForm,
    customAddresses: [],
    deliveryOption: "standard",
    paymentTab: "online",
    confirmedOrder: null,
  };
}

function normalizeStoredState(
  value: unknown,
  fallback: CheckoutState
): CheckoutState {
  if (!value || typeof value !== "object") return fallback;

  const stored = value as Partial<CheckoutState>;
  const step = CHECKOUT_STEPS.some((item) => item.id === stored.step)
    ? (stored.step as CheckoutStep)
    : fallback.step;

  return {
    ...fallback,
    step,
    selectedAddressId:
      typeof stored.selectedAddressId === "string"
        ? stored.selectedAddressId
        : fallback.selectedAddressId,
    draftAddress:
      stored.draftAddress && typeof stored.draftAddress === "object"
        ? { ...fallback.draftAddress, ...stored.draftAddress }
        : fallback.draftAddress,
    customAddresses: Array.isArray(stored.customAddresses)
      ? stored.customAddresses.filter(
          (address): address is CheckoutAddress =>
            Boolean(
              address &&
                typeof address.id === "string" &&
                typeof address.line1 === "string" &&
                typeof address.city === "string" &&
                typeof address.state === "string" &&
                typeof address.pincode === "string"
            )
        )
      : fallback.customAddresses,
    deliveryOption:
      stored.deliveryOption === "standard" ||
      stored.deliveryOption === "express" ||
      stored.deliveryOption === "same-day"
        ? stored.deliveryOption
        : fallback.deliveryOption,
    paymentTab:
      stored.paymentTab === "online" || stored.paymentTab === "upi"
        ? stored.paymentTab
        : fallback.paymentTab,
    confirmedOrder:
      stored.confirmedOrder && typeof stored.confirmedOrder === "object"
        ? (stored.confirmedOrder as ConfirmedOrder)
        : fallback.confirmedOrder,
  };
}

export function CheckoutFlow({ savedAddresses, user }: CheckoutFlowProps) {
  const {
    items,
    subtotal,
    estimatedTax,
    cartCount,
    isReady: isCartReady,
    clearCart,
  } = useCart();
  const [checkout, setCheckout] = useState<CheckoutState>(() =>
    getInitialState(savedAddresses)
  );
  const [isReady, setIsReady] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [onlinePaymentStatus, setOnlinePaymentStatus] =
    useState<OnlinePaymentStatus>("idle");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [qrPayment, setQrPayment] =
    useState<QrPaymentState>(emptyQrPaymentState);
  const allAddresses = useMemo(
    () => [...savedAddresses, ...checkout.customAddresses],
    [savedAddresses, checkout.customAddresses]
  );
  const selectedAddress = allAddresses.find(
    (address) => address.id === checkout.selectedAddressId
  );
  const selectedPincode =
    selectedAddress?.pincode || checkout.draftAddress.pincode || "";
  const sameDayServiceable =
    PINCODE_REGEX.test(selectedPincode) &&
    isPincodeServiceableForSameDay(selectedPincode);
  const shippingOptions = useMemo(
    () => [
      {
        id: "standard" as const,
        title: "Standard Delivery",
        meta: "5-7 days",
        price: subtotal >= 499 ? 0 : 49,
        estimate: `${formatDate(addDays(5))} - ${formatDate(addDays(7))}`,
        estimatedDelivery: addDays(7),
      },
      {
        id: "express" as const,
        title: "Express Delivery",
        meta: "2-3 days",
        price: 99,
        estimate: `${formatDate(addDays(2))} - ${formatDate(addDays(3))}`,
        estimatedDelivery: addDays(3),
      },
      ...(sameDayServiceable
        ? [
            {
              id: "same-day" as const,
              title: "Same-Day Delivery",
              meta: "Today",
              price: 199,
              estimate: formatDate(new Date()),
              estimatedDelivery: new Date(),
            },
          ]
        : []),
    ],
    [sameDayServiceable, subtotal]
  );
  const selectedShippingOption =
    shippingOptions.find((option) => option.id === checkout.deliveryOption) ??
    shippingOptions[0];
  const shippingCost = selectedShippingOption.price;
  const discount = 0;
  const orderTotal = Math.max(0, subtotal - discount + estimatedTax + shippingCost);
  const activeStepIndex = CHECKOUT_STEPS.findIndex(
    (step) => step.id === checkout.step
  );
  const pincodeHint = getPincodeHint(checkout.draftAddress.pincode);
  const isDraftPincodeValid =
    !checkout.draftAddress.pincode ||
    PINCODE_REGEX.test(checkout.draftAddress.pincode);
  const canContinueFromAddress = Boolean(selectedAddress);
  const isCartEmpty = items.length === 0;

  useEffect(() => {
    const fallback = getInitialState(savedAddresses);

    try {
      const stored = window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
      if (stored) {
        setCheckout(normalizeStoredState(JSON.parse(stored), fallback));
      }
    } catch {
      setCheckout(fallback);
    } finally {
      setIsReady(true);
    }
  }, [savedAddresses]);

  useEffect(() => {
    if (!isReady) return;
    window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(checkout));
  }, [checkout, isReady]);

  useEffect(() => {
    if (
      checkout.deliveryOption === "same-day" &&
      !shippingOptions.some((option) => option.id === "same-day")
    ) {
      setCheckout((current) => ({ ...current, deliveryOption: "standard" }));
    }
  }, [checkout.deliveryOption, shippingOptions]);

  useEffect(() => {
    if (
      checkout.draftAddress.pincode.length === 6 &&
      PINCODE_REGEX.test(checkout.draftAddress.pincode)
    ) {
      const hint = getPincodeHint(checkout.draftAddress.pincode);

      if (hint) {
        setCheckout((current) => ({
          ...current,
          draftAddress: {
            ...current.draftAddress,
            city: current.draftAddress.city || hint.city,
            state: current.draftAddress.state || hint.state,
          },
        }));
      }
    }
  }, [checkout.draftAddress.pincode]);

  const updateDraftAddress = useCallback(
    <Key extends keyof AddressFormState>(
      key: Key,
      value: AddressFormState[Key]
    ) => {
      setCheckout((current) => ({
        ...current,
        draftAddress: {
          ...current.draftAddress,
          [key]: value,
        },
      }));
    },
    []
  );

  const addDraftAddress = useCallback(() => {
    const draft = checkout.draftAddress;

    if (
      !draft.label.trim() ||
      !draft.line1.trim() ||
      !draft.city.trim() ||
      !draft.state.trim() ||
      !PINCODE_REGEX.test(draft.pincode)
    ) {
      return;
    }

    const newAddress: CheckoutAddress = {
      id: `new-${Date.now()}`,
      label: draft.label.trim(),
      line1: draft.line1.trim(),
      line2: draft.line2.trim() || null,
      city: draft.city.trim(),
      state: draft.state.trim(),
      pincode: draft.pincode,
      isDefault: draft.isDefault,
    };

    setCheckout((current) => ({
      ...current,
      selectedAddressId: newAddress.id,
      customAddresses: [
        ...current.customAddresses.map((address) =>
          newAddress.isDefault ? { ...address, isDefault: false } : address
        ),
        newAddress,
      ],
      draftAddress: emptyAddressForm,
    }));
  }, [checkout.draftAddress]);

  const goToStep = (step: CheckoutStep) => {
    const nextIndex = CHECKOUT_STEPS.findIndex((item) => item.id === step);
    if (nextIndex <= activeStepIndex) {
      setCheckout((current) => ({ ...current, step }));
    }
  };

  const continueCheckout = () => {
    const nextStep = CHECKOUT_STEPS[activeStepIndex + 1]?.id;
    if (!nextStep) return;
    setCheckout((current) => ({ ...current, step: nextStep }));
  };

  const finishPaidOrder = useCallback(
    (order: ConfirmedOrder) => {
      clearCart();
      setPaymentOrder(null);
      setCheckout((current) => ({
        ...current,
        step: "confirm",
        confirmedOrder: order,
      }));

      fetch("/api/emails/order-confirmation", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      }).catch(() => undefined);

      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [clearCart]
  );

  const createPendingOrder = useCallback(
    async (paymentMethod: PaymentTab) => {
      if (!selectedAddress) {
        throw new Error("Select a delivery address before paying.");
      }

      if (paymentOrder) return paymentOrder;

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
          addressId: selectedAddress.id,
          address: selectedAddress,
          shippingMethod: selectedShippingOption.title,
          estimatedDelivery: selectedShippingOption.estimatedDelivery.toISOString(),
          paymentMethod,
          subtotal,
          discount,
          tax: estimatedTax,
          shipping: shippingCost,
          total: orderTotal,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        order?: ApiOrder;
        error?: string;
      } | null;

      if (!response.ok || !payload?.order?.id) {
        throw new Error(payload?.error ?? "Unable to place order right now.");
      }

      const order = mapConfirmedOrder(
        payload.order,
        items,
        orderTotal,
        selectedShippingOption.estimatedDelivery.toISOString()
      );
      const pendingOrder: PaymentOrder = {
        ...order,
        paymentStartedAt: new Date().toISOString(),
      };

      setPaymentOrder(pendingOrder);
      return pendingOrder;
    },
    [
      discount,
      estimatedTax,
      items,
      orderTotal,
      paymentOrder,
      selectedAddress,
      selectedShippingOption,
      shippingCost,
      subtotal,
    ]
  );

  const startOnlinePayment = useCallback(async () => {
    if (onlinePaymentStatus === "creating" || onlinePaymentStatus === "verifying") {
      return;
    }

    setOnlinePaymentStatus("creating");
    setPaymentError(null);
    setOrderError(null);

    try {
      const order = await createPendingOrder("online");
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      });
      const payload = (await response.json().catch(() => null)) as {
        keyId?: string;
        amount?: number;
        currency?: string;
        razorpayOrderId?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.keyId || !payload.razorpayOrderId) {
        throw new Error(payload?.error ?? "Unable to start Razorpay payment.");
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Payment popup could not open. Please disable popup blockers and retry.");
      }

      const razorpay = new window.Razorpay({
        key: payload.keyId,
        amount: payload.amount ?? Math.round(order.total * 100),
        currency: payload.currency ?? "INR",
        name: "Premium Commerce",
        description: `Order ${order.id}`,
        order_id: payload.razorpayOrderId,
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },
        theme: {
          color: "#f59e0b",
        },
        modal: {
          ondismiss: () => {
            setOnlinePaymentStatus("error");
            setPaymentError("Payment window was closed. You can retry when ready.");
          },
        },
        handler: async (paymentResponse) => {
          setOnlinePaymentStatus("verifying");

          try {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(paymentResponse),
            });
            const verifyPayload = (await verifyResponse.json().catch(() => null)) as {
              order?: ApiOrder;
              error?: string;
            } | null;

            if (!verifyResponse.ok) {
              throw new Error(
                verifyPayload?.error ?? "Payment verification failed. Please retry."
              );
            }

            finishPaidOrder(
              verifyPayload?.order
                ? mapConfirmedOrder(
                    verifyPayload.order,
                    items,
                    order.total,
                    order.estimatedDelivery
                  )
                : order
            );
            setOnlinePaymentStatus("idle");
          } catch (error) {
            setOnlinePaymentStatus("error");
            setPaymentError(
              error instanceof Error
                ? error.message
                : "Payment verification failed. Please retry."
            );
          }
        },
      });

      razorpay.on("payment.failed", (response) => {
        setOnlinePaymentStatus("error");
        setPaymentError(
          response.error?.description ??
            response.error?.reason ??
            "Payment failed. Please retry."
        );
      });
      razorpay.open();
    } catch (error) {
      setOnlinePaymentStatus("error");
      setPaymentError(
        error instanceof Error ? error.message : "Unable to start payment right now."
      );
    }
  }, [
    createPendingOrder,
    finishPaidOrder,
    items,
    onlinePaymentStatus,
    user.email,
    user.name,
    user.phone,
  ]);

  const startQrPayment = useCallback(
    async (forceNew = false) => {
      if (qrPayment.status === "loading" && !forceNew) return;
      if (qrPayment.status === "pending" && qrPayment.qrId && !forceNew) return;

      setQrPayment({
        ...emptyQrPaymentState,
        status: "loading",
      });
      setPaymentError(null);
      setOrderError(null);

      try {
        const order = await createPendingOrder("upi");
        const response = await fetch("/api/payments/create-qr", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId: order.id }),
        });
        const payload = (await response.json().catch(() => null)) as {
          orderId?: string;
          qr_id?: string;
          qr_image_url?: string;
          expires_at?: string;
          error?: string;
        } | null;

        if (
          !response.ok ||
          !payload?.qr_id ||
          !payload.qr_image_url ||
          !payload.expires_at
        ) {
          throw new Error(payload?.error ?? "Unable to generate QR payment.");
        }

        setQrPayment({
          orderId: payload.orderId ?? order.id,
          qrId: payload.qr_id,
          imageUrl: payload.qr_image_url,
          expiresAt: payload.expires_at,
          status: "pending",
          error: null,
        });
      } catch (error) {
        setQrPayment({
          ...emptyQrPaymentState,
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Unable to generate QR payment.",
        });
      }
    },
    [createPendingOrder, qrPayment.qrId, qrPayment.status]
  );

  const placeOrder = async () => {
    if (!selectedAddress || isPlacingOrder) return;

    setIsPlacingOrder(true);
    setOrderError(null);

    try {
      if (checkout.paymentTab === "online") {
        await startOnlinePayment();
        return;
      }

      await startQrPayment(true);
      setCheckout((current) => ({ ...current, step: "payment", paymentTab: "upi" }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setOrderError(
        error instanceof Error ? error.message : "Unable to place order right now."
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  useEffect(() => {
    if (
      !isReady ||
      checkout.step !== "payment" ||
      checkout.paymentTab !== "upi" ||
      !selectedAddress ||
      !items.length ||
      qrPayment.status !== "idle"
    ) {
      return;
    }

    startQrPayment().catch(() => undefined);
  }, [
    checkout.paymentTab,
    checkout.step,
    isReady,
    items.length,
    qrPayment.status,
    selectedAddress,
    startQrPayment,
  ]);

  useEffect(() => {
    if (qrPayment.status !== "pending" || !qrPayment.qrId) return;

    const interval = window.setInterval(async () => {
      if (qrPayment.expiresAt && new Date(qrPayment.expiresAt).getTime() <= Date.now()) {
        setQrPayment((current) => ({ ...current, status: "expired" }));
        return;
      }

      const response = await fetch(`/api/payments/qr-status/${qrPayment.qrId}`, {
        headers: { Accept: "application/json" },
      }).catch(() => null);

      if (!response) return;

      const payload = (await response.json().catch(() => null)) as {
        status?: "pending" | "paid" | "expired";
        order?: ApiOrder;
      } | null;

      if (payload?.status === "paid") {
        window.clearInterval(interval);
        const order =
          payload.order && paymentOrder
            ? mapConfirmedOrder(
                payload.order,
                items,
                paymentOrder.total,
                paymentOrder.estimatedDelivery
              )
            : paymentOrder;

        if (order) {
          setQrPayment((current) => ({ ...current, status: "paid" }));
          finishPaidOrder(order);
        }
      }

      if (payload?.status === "expired") {
        setQrPayment((current) => ({ ...current, status: "expired" }));
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [
    finishPaidOrder,
    items,
    paymentOrder,
    qrPayment.expiresAt,
    qrPayment.qrId,
    qrPayment.status,
  ]);

  if (!isCartReady) {
    return (
      <section className="rounded-lg border border-[#e2e8f0] bg-white p-8 text-center shadow-sm">
        <PackageCheck className="mx-auto h-8 w-8 text-[#94a3b8]" />
        <p className="mt-3 text-sm font-semibold text-[#475569]">
          Loading checkout...
        </p>
      </section>
    );
  }

  if (isCartEmpty && checkout.step !== "confirm") {
    return (
      <section className="mx-auto max-w-xl py-20 text-center">
        <PackageCheck className="mx-auto h-10 w-10 text-[#94a3b8]" />
        <h1 className="mt-4 text-2xl font-semibold text-[#0f172a]">
          Your cart is empty
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#64748b]">
          Add items to your cart before starting checkout.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-[#0f172a] px-4 text-sm font-semibold text-white"
        >
          Browse Products
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-5">
          {CHECKOUT_STEPS.map((step, index) => {
            const isActive = step.id === checkout.step;
            const isComplete = index < activeStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                className={`flex min-h-14 items-center gap-3 rounded-md border px-3 text-left transition ${
                  isActive
                    ? "border-[#f59e0b] bg-[#fffbeb]"
                    : isComplete
                      ? "border-[#bbf7d0] bg-[#f0fdf4]"
                      : "border-[#e2e8f0] bg-white"
                }`}
                onClick={() => goToStep(step.id)}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isComplete
                      ? "bg-[#16a34a] text-white"
                      : isActive
                        ? "bg-[#f59e0b] text-[#111827]"
                        : "bg-[#f1f5f9] text-[#64748b]"
                  }`}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="text-sm font-semibold text-[#0f172a]">
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-sm">
          {checkout.step === "address" ? (
            <AddressStep
              addresses={allAddresses}
              selectedAddressId={checkout.selectedAddressId}
              draftAddress={checkout.draftAddress}
              isDraftPincodeValid={isDraftPincodeValid}
              pincodeHint={pincodeHint}
              canContinue={canContinueFromAddress}
              onSelectAddress={(id) =>
                setCheckout((current) => ({ ...current, selectedAddressId: id }))
              }
              onDraftChange={updateDraftAddress}
              onAddAddress={addDraftAddress}
              onContinue={continueCheckout}
            />
          ) : null}

          {checkout.step === "delivery" ? (
            <DeliveryStep
              selectedPincode={selectedAddress?.pincode}
              sameDayServiceable={sameDayServiceable}
              options={shippingOptions}
              selectedOptionId={checkout.deliveryOption}
              onSelect={(deliveryOption) =>
                setCheckout((current) => ({ ...current, deliveryOption }))
              }
              onBack={() =>
                setCheckout((current) => ({ ...current, step: "address" }))
              }
              onContinue={continueCheckout}
            />
          ) : null}

          {checkout.step === "payment" ? (
            <PaymentStep
              paymentTab={checkout.paymentTab}
              total={orderTotal}
              onlinePaymentStatus={onlinePaymentStatus}
              paymentError={paymentError}
              qrPayment={qrPayment}
              onPaymentTabChange={(paymentTab) =>
                setCheckout((current) => ({ ...current, paymentTab }))
              }
              onStartOnlinePayment={startOnlinePayment}
              onGenerateQr={() => startQrPayment(true)}
              onSwitchPaymentMethod={() =>
                setCheckout((current) => ({ ...current, paymentTab: "online" }))
              }
              onBack={() =>
                setCheckout((current) => ({ ...current, step: "delivery" }))
              }
              onContinue={continueCheckout}
            />
          ) : null}

          {checkout.step === "review" ? (
            <ReviewStep
              items={items}
              selectedAddress={selectedAddress}
              selectedShippingOption={selectedShippingOption}
              paymentTab={checkout.paymentTab}
              subtotal={subtotal}
              discount={discount}
              tax={estimatedTax}
              shipping={shippingCost}
              total={orderTotal}
              isPlacingOrder={isPlacingOrder}
              orderError={orderError}
              onBack={() =>
                setCheckout((current) => ({ ...current, step: "payment" }))
              }
              onPlaceOrder={placeOrder}
            />
          ) : null}

          {checkout.step === "confirm" ? (
            <ConfirmStep confirmedOrder={checkout.confirmedOrder} />
          ) : null}
        </section>

        <aside className="h-fit rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#0f172a]">Order Summary</h2>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 text-[#64748b]">
                  {item.name} x {item.quantity}
                </span>
                <span className="shrink-0 font-semibold text-[#0f172a]">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
            {!items.length && checkout.confirmedOrder
              ? checkout.confirmedOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 text-[#64748b]">
                      {item.name} x {item.quantity}
                    </span>
                    <span className="shrink-0 font-semibold text-[#0f172a]">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))
              : null}
          </div>
          <div className="mt-5 space-y-3 border-t border-[#e2e8f0] pt-5 text-sm">
            <div className="flex justify-between text-[#475569]">
              <span>Items</span>
              <span className="font-semibold text-[#0f172a]">{cartCount}</span>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#0f172a]">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Discount</span>
              <span className="font-semibold text-[#166534]">
                -{formatCurrency(discount)}
              </span>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Tax</span>
              <span className="font-semibold text-[#0f172a]">
                {formatCurrency(estimatedTax)}
              </span>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Shipping</span>
              <span className="font-semibold text-[#0f172a]">
                {shippingCost === 0 ? "Free" : formatCurrency(shippingCost)}
              </span>
            </div>
          </div>
          <div className="mt-5 flex justify-between border-t border-[#e2e8f0] pt-5">
            <span className="text-base font-semibold text-[#0f172a]">Total</span>
            <span className="text-xl font-bold text-[#0f172a]">
              {formatCurrency(checkout.confirmedOrder?.total ?? orderTotal)}
            </span>
          </div>
          <div className="mt-5 rounded-md bg-[#f8fafc] p-3 text-sm text-[#64748b]">
            <CalendarDays className="mb-2 h-4 w-4 text-[#f59e0b]" />
            Selected delivery: {selectedShippingOption.title}
          </div>
        </aside>
      </div>
    </div>
  );
}

function AddressStep({
  addresses,
  selectedAddressId,
  draftAddress,
  isDraftPincodeValid,
  pincodeHint,
  canContinue,
  onSelectAddress,
  onDraftChange,
  onAddAddress,
  onContinue,
}: {
  addresses: CheckoutAddress[];
  selectedAddressId: string | null;
  draftAddress: AddressFormState;
  isDraftPincodeValid: boolean;
  pincodeHint: { city: string; state: string } | null;
  canContinue: boolean;
  onSelectAddress: (id: string) => void;
  onDraftChange: <Key extends keyof AddressFormState>(
    key: Key,
    value: AddressFormState[Key]
  ) => void;
  onAddAddress: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">
          Delivery Address
        </h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Select a saved address or add a new one for this checkout.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {addresses.map((address) => {
          const isSelected = selectedAddressId === address.id;

          return (
            <button
              key={address.id}
              type="button"
              className={`rounded-lg border p-4 text-left transition ${
                isSelected
                  ? "border-[#f59e0b] bg-[#fffbeb] ring-2 ring-[#fde68a]"
                  : "border-[#e2e8f0] hover:border-[#f59e0b]"
              }`}
              onClick={() => onSelectAddress(address.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
                  <Home className="h-4 w-4 text-[#f59e0b]" />
                  {address.label}
                </span>
                {address.isDefault ? (
                  <span className="rounded bg-[#dcfce7] px-2 py-1 text-xs font-semibold text-[#166534]">
                    Default
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-[#475569]">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city}, {address.state} {address.pincode}
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-[#e2e8f0] p-4">
        <h2 className="text-base font-semibold text-[#0f172a]">
          Add New Address
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextInput
            label="Label"
            value={draftAddress.label}
            placeholder="Home"
            onChange={(value) => onDraftChange("label", value)}
          />
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-[#334155]">Pincode</span>
            <input
              value={draftAddress.pincode}
              onChange={(event) =>
                onDraftChange(
                  "pincode",
                  event.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              inputMode="numeric"
              placeholder="560001"
              className={`h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-[#f59e0b] ${
                isDraftPincodeValid ? "border-[#cbd5e1]" : "border-[#dc2626]"
              }`}
            />
            {!isDraftPincodeValid ? (
              <span className="text-xs font-medium text-[#991b1b]">
                Enter a valid 6-digit pincode.
              </span>
            ) : pincodeHint ? (
              <span className="text-xs font-medium text-[#166534]">
                Autofill available: {pincodeHint.city}, {pincodeHint.state}
              </span>
            ) : null}
          </label>
          <TextInput
            label="Address line 1"
            value={draftAddress.line1}
            placeholder="House number, building, street"
            className="md:col-span-2"
            onChange={(value) => onDraftChange("line1", value)}
          />
          <TextInput
            label="Address line 2"
            value={draftAddress.line2}
            placeholder="Area, landmark"
            className="md:col-span-2"
            onChange={(value) => onDraftChange("line2", value)}
          />
          <TextInput
            label="City"
            value={draftAddress.city}
            onChange={(value) => onDraftChange("city", value)}
          />
          <TextInput
            label="State"
            value={draftAddress.state}
            onChange={(value) => onDraftChange("state", value)}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-[#334155]">
            <input
              type="checkbox"
              checked={draftAddress.isDefault}
              onChange={(event) =>
                onDraftChange("isDefault", event.target.checked)
              }
              className="size-4 rounded border-[#cbd5e1]"
            />
            Set as default
          </label>
          <button
            type="button"
            className="h-10 rounded-md border border-[#cbd5e1] px-4 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc]"
            onClick={onAddAddress}
          >
            Add Address
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canContinue}
          className="h-11 rounded-md bg-[#f59e0b] px-5 text-sm font-bold text-[#111827] transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  className,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`space-y-1.5 ${className ?? ""}`}>
      <span className="text-sm font-semibold text-[#334155]">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#f59e0b]"
      />
    </label>
  );
}

function DeliveryStep({
  selectedPincode,
  sameDayServiceable,
  options,
  selectedOptionId,
  onSelect,
  onBack,
  onContinue,
}: {
  selectedPincode?: string;
  sameDayServiceable: boolean;
  options: Array<{
    id: DeliveryOptionId;
    title: string;
    meta: string;
    price: number;
    estimate: string;
    estimatedDelivery: Date;
  }>;
  selectedOptionId: DeliveryOptionId;
  onSelect: (option: DeliveryOptionId) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">
          Delivery Options
        </h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Delivery estimates are based on {selectedPincode}.
        </p>
      </div>
      <div className="grid gap-3">
        {options.map((option) => {
          const isSelected = selectedOptionId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              className={`grid gap-3 rounded-lg border p-4 text-left transition md:grid-cols-[1fr_auto] md:items-center ${
                isSelected
                  ? "border-[#f59e0b] bg-[#fffbeb] ring-2 ring-[#fde68a]"
                  : "border-[#e2e8f0] hover:border-[#f59e0b]"
              }`}
              onClick={() => onSelect(option.id)}
            >
              <span className="flex gap-3">
                <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-[#f1f5f9] text-[#64748b]">
                  <Radio className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#0f172a]">
                    {option.title}
                  </span>
                  <span className="mt-1 block text-sm text-[#64748b]">
                    {option.meta} - Estimated {option.estimate}
                  </span>
                </span>
              </span>
              <span className="text-sm font-bold text-[#0f172a]">
                {option.price === 0 ? "Free" : formatCurrency(option.price)}
              </span>
            </button>
          );
        })}
      </div>
      {!sameDayServiceable ? (
        <div className="rounded-md bg-[#f8fafc] px-4 py-3 text-sm text-[#64748b]">
          Same-day delivery is currently unavailable for this pincode.
        </div>
      ) : null}
      <StepButtons onBack={onBack} onContinue={onContinue} />
    </div>
  );
}

function PaymentStep({
  paymentTab,
  total,
  onlinePaymentStatus,
  paymentError,
  qrPayment,
  onPaymentTabChange,
  onStartOnlinePayment,
  onGenerateQr,
  onSwitchPaymentMethod,
  onBack,
  onContinue,
}: {
  paymentTab: PaymentTab;
  total: number;
  onlinePaymentStatus: OnlinePaymentStatus;
  paymentError: string | null;
  qrPayment: QrPaymentState;
  onPaymentTabChange: (tab: PaymentTab) => void;
  onStartOnlinePayment: () => void;
  onGenerateQr: () => void;
  onSwitchPaymentMethod: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const isOnlineBusy =
    onlinePaymentStatus === "creating" || onlinePaymentStatus === "verifying";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Payment</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Choose an online card flow or QR / UPI payment.
        </p>
      </div>
      <div className="inline-grid rounded-md border border-[#cbd5e1] p-1 sm:grid-cols-2">
        {[
          { id: "online" as const, label: "Pay Online", icon: CreditCard },
          { id: "upi" as const, label: "Pay via QR / UPI", icon: QrCode },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = paymentTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`inline-flex h-10 items-center justify-center gap-2 rounded px-4 text-sm font-semibold transition ${
                isActive
                  ? "bg-[#0f172a] text-white"
                  : "text-[#475569] hover:bg-[#f8fafc]"
              }`}
              onClick={() => onPaymentTabChange(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      {paymentTab === "online" ? (
        <div className="rounded-lg border border-[#e2e8f0] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
                <CreditCard className="h-4 w-4 text-[#f59e0b]" />
                Razorpay secure checkout
              </div>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#64748b]">
                Pay {formatCurrency(total)} with card, UPI, netbanking, or wallet in
                the Razorpay modal.
              </p>
            </div>
            <span className="rounded-md bg-[#f8fafc] px-3 py-1 text-sm font-bold text-[#0f172a]">
              {formatCurrency(total)}
            </span>
          </div>
          {paymentError ? (
            <div className="mt-4 flex gap-2 rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#991b1b]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{paymentError}</span>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isOnlineBusy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f59e0b] px-5 text-sm font-bold text-[#111827] transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onStartOnlinePayment}
            >
              {isOnlineBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {onlinePaymentStatus === "verifying"
                ? "Verifying Payment"
                : "Proceed to Pay"}
            </button>
            <button
              type="button"
              className="h-11 rounded-md border border-[#cbd5e1] px-5 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc]"
              onClick={onContinue}
            >
              Review Order First
            </button>
          </div>
        </div>
      ) : (
        <QrPaymentPanel
          total={total}
          qrPayment={qrPayment}
          onGenerateQr={onGenerateQr}
          onSwitchPaymentMethod={onSwitchPaymentMethod}
        />
      )}
      <div className="flex justify-between gap-3">
        <button
          type="button"
          className="h-11 rounded-md border border-[#cbd5e1] px-5 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc]"
          onClick={onBack}
        >
          Back
        </button>
        {paymentTab === "upi" ? (
          <button
            type="button"
            className="h-11 rounded-md border border-[#cbd5e1] px-5 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc]"
            onClick={onContinue}
          >
            Review Order
          </button>
        ) : null}
      </div>
    </div>
  );
}

function QrPaymentPanel({
  total,
  qrPayment,
  onGenerateQr,
  onSwitchPaymentMethod,
}: {
  total: number;
  qrPayment: QrPaymentState;
  onGenerateQr: () => void;
  onSwitchPaymentMethod: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const isLoading = qrPayment.status === "loading";
  const isExpired = qrPayment.status === "expired";
  const isPaid = qrPayment.status === "paid";
  const hasQr = Boolean(qrPayment.imageUrl);

  useEffect(() => {
    setImageLoaded(false);
  }, [qrPayment.imageUrl]);

  return (
    <div className="rounded-lg border border-[#e2e8f0] p-4">
      <div className="grid gap-5 md:grid-cols-[280px_1fr] md:items-center">
        <div className="flex min-h-[280px] items-center justify-center rounded-lg bg-[#f8fafc] p-4">
          {isLoading || !hasQr ? (
            <div className="size-[250px] animate-pulse rounded-md bg-[#e2e8f0]" />
          ) : (
            <div className="relative">
              {!imageLoaded ? (
                <div className="absolute inset-0 size-[250px] animate-pulse rounded-md bg-[#e2e8f0]" />
              ) : null}
              <Image
                src={qrPayment.imageUrl ?? ""}
                alt="Razorpay UPI QR code"
                width={250}
                height={250}
                className="size-[250px] rounded-md bg-white object-contain"
                onLoad={() => setImageLoaded(true)}
                unoptimized
              />
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
            <QrCode className="h-4 w-4 text-[#f59e0b]" />
            Razorpay dynamic UPI QR
          </div>
          <p className="mt-3 text-sm leading-6 text-[#64748b]">
            Scan to pay exactly {formatCurrency(total)}. The status refreshes every
            3 seconds after the QR is generated.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["GPay", "PhonePe", "Paytm", "BHIM"].map((app) => (
              <span
                key={app}
                className="inline-flex items-center gap-1 rounded-md border border-[#e2e8f0] px-3 py-1 text-xs font-bold text-[#334155]"
              >
                <Smartphone className="h-3.5 w-3.5 text-[#f59e0b]" />
                {app}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-4">
            <QrCountdownRing expiresAt={qrPayment.expiresAt} isActive={qrPayment.status === "pending"} />
            <div>
              {qrPayment.status === "pending" ? (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
                  <span className="size-2 animate-pulse rounded-full bg-[#16a34a]" />
                  Waiting for payment...
                </p>
              ) : null}
              {isLoading ? (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#64748b]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating QR...
                </p>
              ) : null}
              {isPaid ? (
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#166534]">
                  <CheckCircle2 className="h-4 w-4" />
                  Payment received.
                </p>
              ) : null}
              {isExpired ? (
                <p className="text-sm font-semibold text-[#991b1b]">QR Expired</p>
              ) : null}
              {qrPayment.status === "error" ? (
                <p className="text-sm font-semibold text-[#991b1b]">
                  {qrPayment.error ?? "Unable to generate QR."}
                </p>
              ) : null}
            </div>
          </div>
          {isExpired || qrPayment.status === "error" ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0f172a] px-4 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
                onClick={onGenerateQr}
              >
                <RefreshCw className="h-4 w-4" />
                Generate New QR
              </button>
              <button
                type="button"
                className="h-10 rounded-md border border-[#cbd5e1] px-4 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc]"
                onClick={onSwitchPaymentMethod}
              >
                Switch Payment Method
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QrCountdownRing({
  expiresAt,
  isActive,
}: {
  expiresAt: string | null;
  isActive: boolean;
}) {
  const [secondsLeft, setSecondsLeft] = useState(600);

  useEffect(() => {
    if (!expiresAt || !isActive) {
      setSecondsLeft(0);
      return;
    }

    const updateTime = () => {
      setSecondsLeft(
        Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
      );
    };

    updateTime();
    const interval = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAt, isActive]);

  const progress = Math.max(0, Math.min(100, (secondsLeft / 600) * 100));
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div
      className="grid size-16 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#f59e0b ${progress}%, #e2e8f0 ${progress}% 100%)`,
      }}
    >
      <span className="grid size-12 place-items-center rounded-full bg-white font-mono text-xs font-bold text-[#0f172a]">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}

function StepButtons({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex justify-between gap-3">
      <button
        type="button"
        className="h-11 rounded-md border border-[#cbd5e1] px-5 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc]"
        onClick={onBack}
      >
        Back
      </button>
      <button
        type="button"
        className="h-11 rounded-md bg-[#f59e0b] px-5 text-sm font-bold text-[#111827] transition hover:bg-[#fbbf24]"
        onClick={onContinue}
      >
        Continue
      </button>
    </div>
  );
}

function ReviewStep({
  items,
  selectedAddress,
  selectedShippingOption,
  paymentTab,
  subtotal,
  discount,
  tax,
  shipping,
  total,
  isPlacingOrder,
  orderError,
  onBack,
  onPlaceOrder,
}: {
  items: ReturnType<typeof useCart>["items"];
  selectedAddress?: CheckoutAddress;
  selectedShippingOption: {
    title: string;
    estimate: string;
  };
  paymentTab: PaymentTab;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  isPlacingOrder: boolean;
  orderError: string | null;
  onBack: () => void;
  onPlaceOrder: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">
          Review & Place Order
        </h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Check the full order summary before creating your order.
        </p>
      </div>
      <div className="rounded-lg border border-[#e2e8f0]">
        <div className="border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#0f172a]">
          Items
        </div>
        <div className="divide-y divide-[#e2e8f0]">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[72px_1fr_auto] gap-3 p-4"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-[#f8fafc]">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="72px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-sm font-semibold text-[#0f172a]">
                  {item.name}
                </h2>
                {item.variant ? (
                  <p className="mt-1 text-xs text-[#64748b]">{item.variant}</p>
                ) : null}
                <p className="mt-1 text-xs text-[#64748b]">
                  Qty {item.quantity} x {formatCurrency(item.unitPrice)}
                </p>
              </div>
              <p className="text-right text-sm font-bold text-[#0f172a]">
                {formatCurrency(item.unitPrice * item.quantity)}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryInfo icon={MapPin} title="Address">
          {selectedAddress?.line1}, {selectedAddress?.city}, {selectedAddress?.state}{" "}
          {selectedAddress?.pincode}
        </SummaryInfo>
        <SummaryInfo icon={Truck} title="Delivery">
          {selectedShippingOption.title} -{" "}
          {shipping === 0 ? "Free" : formatCurrency(shipping)}
          <br />
          Estimated {selectedShippingOption.estimate}
        </SummaryInfo>
        <SummaryInfo icon={CreditCard} title="Payment">
          {paymentTab === "online" ? "Pay Online" : "QR / UPI"}
        </SummaryInfo>
      </div>
      <div className="rounded-lg border border-[#e2e8f0] p-4">
        <h2 className="text-sm font-semibold text-[#0f172a]">Price Breakdown</h2>
        <div className="mt-4 space-y-3 text-sm">
          <PriceRow label="Subtotal" value={formatCurrency(subtotal)} />
          <PriceRow label="Discount" value={`-${formatCurrency(discount)}`} positive />
          <PriceRow label="Tax" value={formatCurrency(tax)} />
          <PriceRow
            label="Shipping"
            value={shipping === 0 ? "Free" : formatCurrency(shipping)}
          />
          <div className="flex justify-between border-t border-[#e2e8f0] pt-3 text-base font-bold text-[#0f172a]">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
      {orderError ? (
        <div className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#991b1b]">
          {orderError}
        </div>
      ) : null}
      <div className="flex justify-between gap-3">
        <button
          type="button"
          className="h-11 rounded-md border border-[#cbd5e1] px-5 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc]"
          onClick={onBack}
        >
          Back
        </button>
        <button
          type="button"
          disabled={isPlacingOrder || !selectedAddress}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f59e0b] px-5 text-sm font-bold text-[#111827] transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onPlaceOrder}
        >
          {isPlacingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Place Order
        </button>
      </div>
    </div>
  );
}

function SummaryInfo({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#e2e8f0] p-4">
      <Icon className="h-5 w-5 text-[#f59e0b]" />
      <h2 className="mt-3 text-sm font-semibold text-[#0f172a]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#64748b]">{children}</p>
    </div>
  );
}

function PriceRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex justify-between text-[#475569]">
      <span>{label}</span>
      <span className={`font-semibold ${positive ? "text-[#166534]" : "text-[#0f172a]"}`}>
        {value}
      </span>
    </div>
  );
}

function ConfirmStep({ confirmedOrder }: { confirmedOrder: ConfirmedOrder | null }) {
  return (
    <div className="py-16 text-center">
      <span className="mx-auto flex size-16 animate-bounce items-center justify-center rounded-full bg-[#dcfce7] text-[#16a34a]">
        <CheckCircle2 className="h-9 w-9" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-[#0f172a]">
        Order Placed Successfully!
      </h1>
      {confirmedOrder ? (
        <div className="mx-auto mt-6 max-w-2xl rounded-lg border border-[#e2e8f0] p-5 text-left">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase text-[#94a3b8]">
                Order ID
              </p>
              <p className="mt-1 break-all text-sm font-bold text-[#0f172a]">
                {confirmedOrder.id}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[#94a3b8]">
                Estimated Delivery
              </p>
              <p className="mt-1 text-sm font-bold text-[#0f172a]">
                {confirmedOrder.estimatedDelivery
                  ? formatDate(confirmedOrder.estimatedDelivery)
                  : "To be updated"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[#94a3b8]">
                Total Paid
              </p>
              <p className="mt-1 text-sm font-bold text-[#0f172a]">
                {formatCurrency(confirmedOrder.total)}
              </p>
            </div>
          </div>
          <div className="mt-5 border-t border-[#e2e8f0] pt-4">
            <p className="mb-3 text-sm font-semibold text-[#0f172a]">
              Items Summary
            </p>
            <div className="space-y-2">
              {confirmedOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 text-[#64748b]">
                    {item.name} x {item.quantity}
                  </span>
                  <span className="shrink-0 font-semibold text-[#0f172a]">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#64748b]">
          Your order has been recorded.
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/products"
          className="inline-flex h-10 items-center justify-center rounded-md border border-[#cbd5e1] px-4 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc]"
        >
          Continue Shopping
        </Link>
        <Link
          href="/orders"
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#0f172a] px-4 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
        >
          View My Orders
        </Link>
      </div>
    </div>
  );
}
