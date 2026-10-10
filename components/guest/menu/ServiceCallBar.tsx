"use client";

import { Bell, ChefHat, Receipt } from "lucide-react";
import { useState } from "react";
import { apiRequest, jsonRequest } from "@/lib/utils/api-client";

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // One path for every call: the API validates the venue/table, rate-limits, and writes the
  // notification. The browser used to insert into the table directly and ignore the API's answer,
  // so guests were told "notified" even when nothing was stored.
  const sendCall = async (type: "WAITER" | "CHEF" | "BILL", okMessage: string) => {
    setLoadingType(type);
    try {
      const result = await apiRequest("/api/guest/call-staff", jsonRequest("POST", { venue_id: venueId, table_number: tableNo, type }));
      showToast(result.ok ? okMessage : "Couldn't alert staff. Please try again, or wave to the waiter.");
    } finally {
      setLoadingType(null);
    }
  };

  const handleCallStaff = (type: "WAITER" | "CHEF") =>
    sendCall(type, type === "WAITER" ? "Waiter notified successfully!" : "Chef notified successfully!");

  const handleRequestBillAction = async () => {
    if (onRequestBill) {
      onRequestBill();
      return;
    }
    await sendCall("BILL", "Final bill requested — Captain & Host alerted.");
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 my-3 flex items-center justify-center gap-3 relative">
      <button
        onClick={() => handleCallStaff("WAITER")}
        disabled={loadingType === "WAITER"}
        className="flex-1 py-2.5 px-4 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-2xl text-xs font-semibold text-zinc-800 shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
      >
        <Bell className="text-neutral-700" size={14} />
        <span>{loadingType === "WAITER" ? "Calling..." : "Call Waiter"}</span>
      </button>

      {hasOrderPlaced ? (
        <button
          onClick={handleRequestBillAction}
          disabled={isRequestingBill || billRequested || loadingType === "BILL"}
          className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
            billRequested
              ? "bg-amber-500/10 border border-amber-500/30 text-amber-700 cursor-default"
              : "bg-white hover:bg-zinc-50 border border-zinc-200/80 text-zinc-800 disabled:opacity-60"
          }`}
        >
          <Receipt className="text-amber-600" size={14} />
          <span>
            {billRequested
              ? "Bill Requested"
              : isRequestingBill || loadingType === "BILL"
              ? "Requesting..."
              : "Request Bill"}
          </span>
        </button>
      ) : (
        <button
          onClick={() => handleCallStaff("CHEF")}
          disabled={loadingType === "CHEF"}
          className="flex-1 py-2.5 px-4 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-2xl text-xs font-semibold text-zinc-800 shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
        >
          <ChefHat className="text-emerald-600" size={14} />
          <span>{loadingType === "CHEF" ? "Calling..." : "Call Chef"}</span>
        </button>
      )}

      {toastMessage && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-medium shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default ServiceCallBar;
