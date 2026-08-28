/**
 * PHP is a 2-decimal currency, so Stripe amounts are integer centavos.
 *
 * Every amount crossing the Stripe boundary goes through here. Nothing else in
 * the codebase should multiply or divide by 100.
 */

export const PHP = "php";

export const toCentavos = (peso: number): number => {
  if (!Number.isFinite(peso)) throw new Error(`Not a finite amount: ${peso}`);
  return Math.round(peso * 100);
};

export const fromCentavos = (centavos: number): number => centavos / 100;

export const formatPHP = (centavos: number): string =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(fromCentavos(centavos));

/**
 * Split a total into `count` installments whose centavo amounts sum exactly to
 * the total. The remainder lands on the final payment.
 *
 * Dividing and rounding each installment independently is how a schedule ends
 * up a few centavos short of the balance and never closes out.
 */
export const splitInstallments = (
  totalCentavos: number,
  count: number,
): number[] => {
  if (count <= 0) throw new Error("Installment count must be positive.");
  const base = Math.floor(totalCentavos / count);
  const out = new Array(count).fill(base);
  out[count - 1] = totalCentavos - base * (count - 1);
  return out;
};
