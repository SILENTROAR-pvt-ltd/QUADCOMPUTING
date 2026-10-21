'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { InvoicePreviewModal } from './billing/InvoicePreviewModal';
import { TableManagementModal } from './billing/TableManagementModal';
import { TableQRCodeModal } from './billing/TableQRCodeModal';
import { POSCheckoutControls } from './billing/POSCheckoutControls';
import { POSTableSelector } from './billing/POSTableSelector';
import { POSDigitalReceipt } from './billing/POSDigitalReceipt';
import { POSGuestWalletPanel } from './billing/components/POSGuestWalletPanel';
import { POSOrderHistory } from './billing/POSOrderHistory';
import { usePOSCart } from './billing/hooks/usePOSCart';
import { usePOSTables } from './billing/hooks/usePOSTables';
import { useBillingSession } from './billing/hooks/useBillingSession';
import { BillingHeader } from './billing/components/BillingHeader';
import { BillRequestsModal } from './billing/BillRequestsModal';
import { usePOSCatalog } from './billing/hooks/usePOSCatalog';

export function BillingWorkspace({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const storeBusinessId = useHostWorkspace((state) => state.businessId);
  const { tables, businessId, fetchTables, markTableVacant, isOnline, activeStaff, setActiveStaff } =
    usePOSTables(storeBusinessId);
  usePOSCatalog(businessId);

  const serviceCatalog = useHostWorkspace((state) => state.serviceCatalog);
  const activeItems = useMemo(
    () => serviceCatalog.filter((i) => i.status !== 'archived'),
    [serviceCatalog]
  );

  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [showTableModal, setShowTableModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showBillRequests, setShowBillRequests] = useState(false);
  const [seenBillRequestIds, setSeenBillRequestIds] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Modular POS & Table Hooks
  const cart = usePOSCart(activeItems);
  const itemCount = cart.selectedItems.reduce((n, item) => n + item.qty, 0) + (Number(cart.customAmount) > 0 ? 1 : 0);
  const canBill = cart.selectedItems.length > 0 || Number(cart.customAmount) > 0;

  // Session & Settlement Hook
  const {
    orderHistory,
    isLoadingHistory,
    successMessage,
    invoicePreview,
    setInvoicePreview,
    billRequestedTables,
    handleMarkTableVacant,
    handleSelectActiveTable,
    handleSelectActiveRoom,
    handleGenerateBill,
    handleOrderSuccess,
    fetchOrderHistory,
  } = useBillingSession({
    cart,
    tables,
    activeStaff,
    markTableVacant,
    fetchTables,
    businessId,
  });

  const unreadBillRequestCount = billRequestedTables.filter((table) =>
    !seenBillRequestIds.includes(table.activeSession?.sessionId || table.id)
  ).length;
  const openBillRequests = () => {
    setSeenBillRequestIds((seen) => Array.from(new Set([
      ...seen,
      ...billRequestedTables.map((table) => table.activeSession?.sessionId || table.id),
    ])));
    setShowBillRequests(true);
  };

  // Auto-sync active table cart when guest places add-on orders or changes status
  const lastSyncHashRef = React.useRef('');

  useEffect(() => {
    if (!cart.selectedTableNumber || cart.selectedTableNumber === 'Takeaway / Counter') {
      lastSyncHashRef.current = '';
      return;
    }
    const currentTable = tables.find(
      (t) =>
        t.table_number === cart.selectedTableNumber ||
        (t.activeSession && t.activeSession.sessionId === cart.activeSessionId)
    );
    if (currentTable?.activeSession) {
      const sess = currentTable.activeSession;
      const syncHash = `${sess.sessionId || ''}_${sess.status || ''}_${sess.subtotal || ''}_${sess.itemsCount || ''}_${sess.updatedAt || ''}`;
      if (syncHash !== lastSyncHashRef.current) {
        lastSyncHashRef.current = syncHash;
        handleSelectActiveTable(currentTable);
      }
    }
  }, [tables, cart.selectedTableNumber, cart.activeSessionId, handleSelectActiveTable]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchOrderHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- history loads when the History tab opens; fetchOrderHistory is a new function every render and would refetch in a loop
  }, [activeTab]);

  return (
    <div className="animate-in fade-in duration-300 pb-28 lg:pb-20 relative min-w-0">
      {/* Floating Apple-Style Monochrome Toast */}
      {successMessage && (
        <div className="fixed left-1/2 top-4 sm:top-8 z-[110] flex w-max max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-2xl sm:rounded-full border border-neutral-800 bg-neutral-900/95 px-4 sm:px-5 py-3 text-[13px] font-medium text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 slide-in-from-top-10 duration-500 ease-out">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <span className="tracking-wide">{successMessage}</span>
        </div>
      )}

      {/* Masthead & Tab Switcher */}
      <BillingHeader
        activeStaff={activeStaff}
        onLockStaff={() => setActiveStaff(null)}
        isOnline={isOnline}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenQRModal={() => setShowQRModal(true)}
        onOpenBillRequests={openBillRequests}
        onOpenTableModal={() => setShowTableModal(true)}
        unreadBillRequestCount={unreadBillRequestCount}
      />

      {/* Main Content Areas */}
      {activeTab === 'pos' && (
        // On a phone the two columns dissolve (`contents`) into one list ordered table, wallet, catalog; the bill
        // lives in a sheet opened from the bar at the bottom. From `lg` up it is the two-column desk layout.
        <div className="grid min-w-0 gap-4 lg:gap-8 lg:grid-cols-12 items-start">
          <div className="contents lg:block lg:space-y-6 lg:col-span-7 lg:min-w-0">
            <div className="order-3 min-w-0 lg:order-none">
              <POSCheckoutControls
                cafeId={businessId}
                activeItems={activeItems}
                cartItems={cart.selectedItems}
                onAddItemToCart={cart.handleAddItemToCart}
                onAddCustomItem={cart.handleAddCustomItem}
                addItem={cart.addItem}
                customAmount={cart.customAmount}
                setCustomAmount={cart.setCustomAmount}
                discountType={cart.discountType}
                setDiscountType={cart.setDiscountType}
                discountInputValue={cart.discountInputValue}
                setDiscountInputValue={cart.setDiscountInputValue}
                gstEnabled={cart.gstEnabled}
                setGstEnabled={cart.setGstEnabled}
                gstAllowed={cart.gstAllowed}
                gstReason={cart.gstReason}
                redemptionCode={cart.redemptionCode}
                setRedemptionCode={cart.setRedemptionCode}
                verifiedRedemption={cart.verifiedRedemption}
                setVerifiedRedemption={cart.setVerifiedRedemption}
              />
            </div>

            {/* Below the catalog on a desk, so the receipt on the right stays near the top; right under the table on a phone. */}
            <div className="order-2 min-w-0 lg:order-none">
              <POSGuestWalletPanel
                guestHandle={cart.linkedGuestHandle}
                appliedCode={cart.redemptionCode}
                onApply={({ code, amount, guestHandle, walletCode }) => {
                  cart.setDiscountType('flat');
                  cart.setDiscountInputValue(String(amount));
                  cart.setRedemptionCode(code);
                  cart.setVerifiedRedemption({ code, amount, guest_handle: guestHandle, wallet_code: walletCode });
                }}
                onRemove={() => {
                  cart.setRedemptionCode(null);
                  cart.setVerifiedRedemption(null);
                  cart.setDiscountInputValue('');
                }}
              />
            </div>
          </div>

          <div className="contents lg:block lg:col-span-5 lg:space-y-4 lg:sticky lg:top-4 lg:min-w-0 self-start">
            <div className="order-1 min-w-0 lg:order-none">
              <POSTableSelector
                tables={tables}
                selectedTableId={cart.selectedTableId}
                setSelectedTableId={cart.setSelectedTableId}
                selectedTableNumber={cart.selectedTableNumber}
                setSelectedTableNumber={cart.setSelectedTableNumber}
                selectedRoomId={cart.selectedRoomId}
                setSelectedRoomId={cart.setSelectedRoomId}
                onSelectActiveTable={handleSelectActiveTable}
                onSelectActiveRoom={handleSelectActiveRoom}
                onMarkVacant={handleMarkTableVacant}
              />
            </div>

            {/* The bill: a sheet opened from the bottom bar on a phone, a card in the right column on a desk. */}
            <div
              className={`${cartOpen ? 'fixed inset-0 z-[90] flex items-end bg-black/45' : 'hidden'} lg:contents`}
              onClick={() => setCartOpen(false)}
            >
              <div
                className="max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] bg-[#f6f5f1] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3 lg:max-h-none lg:overflow-visible lg:rounded-none lg:bg-transparent lg:p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-2 flex items-center justify-between px-1 lg:hidden">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Current bill</p>
                  <button type="button" onClick={() => setCartOpen(false)} aria-label="Close the bill" className="grid h-10 w-10 place-items-center rounded-full bg-white text-neutral-600 shadow-sm active:scale-95 cursor-pointer">
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <POSDigitalReceipt
                  selectedItems={cart.selectedItems}
                  incrementItem={cart.incrementItem}
                  decrementItem={cart.decrementItem}
                  removeItem={cart.removeItem}
                  customAmount={cart.customAmount}
                  subtotal={cart.subtotal}
                  discountAmount={cart.discountAmount}
                  discountType={cart.discountType}
                  discountValue={cart.discountValue}
                  gstEnabled={cart.gstEnabled}
                  gstAmount={cart.gstAmount}
                  gstRateLabel={cart.gstRateLabel}
                  grandTotal={cart.grandTotal}
                  handleGenerateBill={() => { setCartOpen(false); handleGenerateBill(); }}
                  activeSessionId={cart.activeSessionId}
                  activeSessionStatus={cart.activeSessionStatus}
                  selectedTableNumber={cart.selectedTableNumber}
                  cashbackEnabled={cart.cashbackEnabled}
                  onToggleCashback={cart.setCashbackEnabled}
                  cashbackAmount={cart.cashbackAmount}
                  guestHandle={cart.linkedGuestHandle}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone only: the running bill is always one tap away, with the total and the way to finish. */}
      {activeTab === 'pos' && !invoicePreview && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-neutral-200 bg-white/95 px-3 pt-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] shadow-[0_-14px_28px_-20px_rgba(0,0,0,0.35)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-2">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Open the bill, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
              className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-neutral-200 bg-white text-neutral-800 active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-neutral-900 px-1 text-[11px] font-bold text-white">{itemCount}</span>
              )}
            </button>
            <button
              type="button"
              onClick={handleGenerateBill}
              disabled={!canBill}
              className="flex h-14 min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl bg-neutral-900 px-5 text-white shadow-[0_14px_24px_-14px_rgba(0,0,0,0.6)] active:scale-[0.99] disabled:bg-neutral-300 disabled:shadow-none cursor-pointer"
            >
              <span className="truncate text-[14px] font-semibold">{canBill ? (cart.activeSessionStatus === 'bill_requested' ? 'Settle bill' : 'Finalize bill') : 'Add items to bill'}</span>
              {canBill && <span className="font-mono text-[16px] font-semibold">₹{cart.grandTotal.toFixed(0)}</span>}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <POSOrderHistory
          isLoadingHistory={isLoadingHistory}
          orderHistory={orderHistory}
          setInvoicePreview={setInvoicePreview}
        />
      )}

      {/* Modals */}
      {invoicePreview && (
        <InvoicePreviewModal
          invoice={invoicePreview}
          onClose={() => setInvoicePreview(null)}
          onSuccess={(paymentMethod, saved) => handleOrderSuccess(activeTab === 'history' ? fetchOrderHistory : undefined, paymentMethod, saved)}
        />
      )}

      {showTableModal && (
        <TableManagementModal
          onClose={() => setShowTableModal(false)}
          onTablesChanged={fetchTables}
          businessId={businessId}
        />
      )}

      {showQRModal && (
        <TableQRCodeModal
          tables={tables}
          selectedTableId={cart.selectedTableId}
          cafeId={businessId || ''}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {showBillRequests && (
        <BillRequestsModal
          activeTables={billRequestedTables}
          onClose={() => setShowBillRequests(false)}
          onSelectTable={(table) => {
            void handleSelectActiveTable(table);
            setShowBillRequests(false);
          }}
        />
      )}
    </div>
  );
}
