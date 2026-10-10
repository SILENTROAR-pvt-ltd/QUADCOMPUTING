// Where venues pay the platform (plans and wallet top-ups). Set PLATFORM_UPI_ID and
// PLATFORM_PAYEE_NAME in the environment; the defaults keep the current receiving account.

export function platformPayment() {
  return {
    upi_id: process.env.PLATFORM_UPI_ID?.trim() || 'singhharshit1224@oksbi',
    payee_name: process.env.PLATFORM_PAYEE_NAME?.trim() || 'Quad Computing',
  };
}
