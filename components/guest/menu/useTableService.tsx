"use client";

import React, { useCallback, useState } from "react";
import { apiRequest, jsonRequest } from "@/lib/utils/api-client";
import { StaffCallSheet } from "./StaffCallSheet";

/**
 * Asking for table service from anywhere on the menu: `open()` raises the request sheet, `sheet` is the element to render
 * once. The request goes through the same API as every guest call, and `onSent` is told what to say when it is received.
 */
export function useTableService(venueId: string, tableNo: string, onSent: (message: string) => void) {
  const [isOpen, setOpen] = useState(false);

  const send = useCallback(async (_target: "WAITER" | "CHEF", message: string) => {
    const result = await apiRequest("/api/guest/call-staff", jsonRequest("POST", { venue_id: venueId, table_number: tableNo, type: "WAITER", ...(message ? { message } : {}) }));
    if (result.ok) onSent(message ? `Request sent: ${message}` : "Our team has been told and will come to your table");
    return result.ok;
  }, [venueId, tableNo, onSent]);

  const open = useCallback(() => setOpen(true), []);
  const sheet: React.ReactNode = isOpen ? <StaffCallSheet initial="WAITER" onSend={send} onClose={() => setOpen(false)} /> : null;
  return { open, sheet };
}
