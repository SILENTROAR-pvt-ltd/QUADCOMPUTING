"use client";

import { ConciergeBell, Receipt } from "lucide-react";
import { useState } from "react";
import { apiRequest, jsonRequest } from "@/lib/utils/api-client";
import { StaffCallSheet } from "./StaffCallSheet";

export interface ServiceCallBarProps {
  venueId: string;
  tableNo: string;
  hasOrderPlaced?: boolean;
  onRequestBill?: () => void;
  isRequestingBill?: boolean;
  billRequested?: boolean;
}

export function ServiceCallBar({
  venueId,
  tableNo,
  hasOrderPlaced = false,
  onRequestBill,
  isRequestingBill = false,
  billRequested = false,
}: ServiceCallBarProps) {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // One path for every request: the API validates the venue/table, rate-limits, and writes the
  // notification. The browser used to insert into the table directly and ignore the API's answer,
  // so guests were told "notified" even when nothing was stored.
  const sendCall = async (type: "WAITER" | "BILL", message?: string) => {
    setLoadingType(type);
    try {
      const result = await apiRequest("/api/guest/call-staff", jsonRequest("POST", { venue_id: venueId, table_number: tableNo, type, ...(message ? { message } : {}) }));
      return result.ok;
    } finally {
      setLoadingType(null);
    }
  };

  const sendFromSheet = async (_target: "WAITER" | "CHEF", message: string) => {
    const ok = await sendCall("WAITER", message);
    if (ok) showToast(message ? `Request sent: ${message}` : "Our team has been told and will come to your table");
    return ok;
  };

  const handleRequestBillAction = async () => {
    if (billRequested) return;
    if (onRequestBill) {
      onRequestBill();
      return;
    }
    const ok = await sendCall("BILL");
    showToast(ok ? "Final bill requested — Captain & Host alerted." : "Couldn't alert staff. Please try again, or wave to the waiter.");
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 my-3 relative">
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setSheetOpen(true)}
          disabled={loadingType === "WAITER"}
          className="flex-[1.45] whitespace-nowrap py-2.5 px-3 bg-[#fbf9f4] hover:bg-white border border-[#e8dfcc] rounded-full text-xs font-semibold text-[#10231a] shadow-[0_10px_24px_-20px_rgba(16,35,26,0.6)] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
        >
          <ConciergeBell className="text-[#8a6d3f]" size={14} />
          <span>{loadingType === "WAITER" ? "Sending..." : "Request table service"}</span>
        </button>

        {hasOrderPlaced && (
          <button
            onClick={handleRequestBillAction}
            disabled={isRequestingBill || billRequested || loadingType === "BILL"}
            className={`flex-1 whitespace-nowrap py-2.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
              billRequested
                ? "bg-[#fbf6e8] border border-[#d9c193] text-[#6f5631] cursor-default"
                : "bg-[#fbf9f4] hover:bg-white border border-[#e8dfcc] text-[#10231a] shadow-[0_10px_24px_-20px_rgba(16,35,26,0.6)] disabled:opacity-60"
            }`}
          >
            <Receipt className="text-[#8a6d3f]" size={14} />
            <span>
              {billRequested
                ? "Bill Requested"
                : isRequestingBill || loadingType === "BILL"
                ? "Requesting..."
                : "Request Bill"}
            </span>
          </button>
        )}
      </div>

      {sheetOpen && <StaffCallSheet initial="WAITER" onSend={sendFromSheet} onClose={() => setSheetOpen(false)} />}

      {toastMessage && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 max-w-[92%] truncate bg-[#0f2a1e] text-[#f5f1e8] px-4 py-2 rounded-full text-xs font-medium shadow-xl ring-1 ring-[#d9c193]/30 animate-in fade-in zoom-in-95 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default ServiceCallBar;
