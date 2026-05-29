import type { Metadata } from "next";

import { CartPageView } from "@/components/user/cart-page-view";

export const metadata: Metadata = {
  title: "Cart | Premium Commerce",
};

export default function CartPage() {
  return <CartPageView />;
}
