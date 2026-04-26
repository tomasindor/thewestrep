"use client";

import type { CheckoutAccessCustomerAuthState } from "@/components/cart/checkout-access-step";
import type { CustomerProfileSnapshot } from "@/lib/auth/customer-profile";
import { useCart } from "@/components/cart/cart-provider";
import { useCheckoutController } from "@/hooks/use-checkout-controller";
import { CheckoutHero } from "@/components/cart/checkout-hero";
import { CheckoutEmptyState } from "@/components/cart/checkout-empty-state";
import { CheckoutAccessGate } from "@/components/cart/checkout-access-gate";
import { ContactFormSection } from "@/components/cart/contact-form-section";
import { FulfillmentSection } from "@/components/cart/fulfillment-section";
import { OrderSummarySidebar } from "@/components/cart/order-summary-sidebar";

interface CheckoutExperienceProps {
  customerAuth: CheckoutAccessCustomerAuthState | null;
  customerProfile: CustomerProfileSnapshot | null;
}

export function CheckoutExperience({
  customerAuth,
  customerProfile,
}: CheckoutExperienceProps) {
  const { customer, isHydrated, itemCount, items, openCart, updateCustomer } = useCart();
  const controller = useCheckoutController(customerAuth, customerProfile);

  const {
    subtotal,
    comboDiscountAmountArs,
    shippingFee,
    correoArgentinoFeeTotal,
    total,
    hasRequiredFields,
    hasResolvedAccess,
    hasEncargueOrder,
    isSubmittingOrder,
    isSubmitted,
    submittedOrder,
    submitError,
    hasTriedSubmit,
    savedShippingSummary,
    placeOrder,
    markTriedSubmit,
  } = controller;

  const handlePlaceOrder = () => {
    markTriedSubmit();
    placeOrder();
  };

  return (
    <main className="flex-1 py-10 sm:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 lg:px-8">
        <CheckoutHero isHydrated={isHydrated} itemsCount={items.length} unitCount={itemCount} />

        {items.length === 0 ? (
          <CheckoutEmptyState />
        ) : (
          <>
            {!hasResolvedAccess ? (
              <CheckoutAccessGate />
            ) : (
              <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                  <ContactFormSection
                    customer={customer}
                    updateCustomer={updateCustomer}
                    hasTriedSubmit={hasTriedSubmit}
                    customerProfile={customerProfile}
                  />

                  <FulfillmentSection
                    customer={customer}
                    updateCustomer={updateCustomer}
                    hasTriedSubmit={hasTriedSubmit}
                    hasEncargueOrder={hasEncargueOrder}
                    correoArgentinoFeeTotal={correoArgentinoFeeTotal}
                    savedShippingSummary={savedShippingSummary}
                    customerProfile={customerProfile}
                  />
                </div>

                <OrderSummarySidebar
                  items={items}
                  customer={customer}
                  subtotal={subtotal}
                  comboDiscountAmountArs={comboDiscountAmountArs}
                  shippingFee={shippingFee}
                  correoArgentinoFeeTotal={correoArgentinoFeeTotal}
                  total={total}
                  itemCount={itemCount}
                  hasRequiredFields={hasRequiredFields}
                  hasEncargueOrder={hasEncargueOrder}
                  isSubmittingOrder={isSubmittingOrder}
                  isSubmitted={isSubmitted}
                  submittedOrder={submittedOrder}
                  submitError={submitError}
                  hasTriedSubmit={hasTriedSubmit}
                  onPlaceOrder={handlePlaceOrder}
                  onOpenCart={openCart}
                />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
