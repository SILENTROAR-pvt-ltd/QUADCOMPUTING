'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

  // Modular POS & Table Hooks
  const cart = usePOSCart(activeItems);

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
  }, [activeTab]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative">
      {/* Floating Apple-Style Monochrome Toast */}
      {successMessage && (
        <div className="fixed left-1/2 top-8 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-full border border-neutral-800 bg-neutral-900/95 px-5 py-3 text-[13px] font-medium text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 slide-in-from-top-10 duration-500 ease-out">
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
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-12 animate-in fade-in zoom-in-95 duration-300 items-start">
          <div className="space-y-6 lg:col-span-7">
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
              redemptionCode={cart.redemptionCode}
              setRedemptionCode={cart.setRedemptionCode}
              verifiedRedemption={cart.verifiedRedemption}
              setVerifiedRedemption={cart.setVerifiedRedemption}
            />

            {/* Below the catalog and add-ons, so the receipt on the right stays near the top. */}
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

          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4 self-start">
            <POSTableSelector
              tables={tables}
              selectedTableId={cart.selectedTableId}
              setSelectedTableId={cart.setSelectedTableId}
              selectedTableNumber={cart.selectedTableNumber}
              setSelectedTableNumber={cart.setSelectedTableNumber}
              selectedRoomId={cart.selectedRoomId}
              setSelectedRoomId={cart.setSelectedRoomId}
              onSelectActiveTable={handleSelectActiveTable}
              onMarkVacant={handleMarkTableVacant}
            />

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
              handleGenerateBill={handleGenerateBill}
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
          onSuccess={(paymentMethod) => handleOrderSuccess(activeTab === 'history' ? fetchOrderHistory : undefined, paymentMethod)}
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
