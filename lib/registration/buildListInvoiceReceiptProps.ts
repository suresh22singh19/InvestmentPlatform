import type { PaymentReceiptCaptureProps } from "@/components/registration/PaymentReceiptCapture";
import type { AppointmentRegistration } from "@/store/api/registrationApi";

function parseMoney(v: unknown): number {
    if (v == null || v === "") return 0;
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : 0;
}

function formatBillDateDdMmYyyy(iso: string | undefined): string {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return "—";
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    } catch {
        return "—";
    }
}

/**
 * Maps appointments-list row → Payment Receipt PDF props.
 * When `payment` is null, all amounts are 0 (invoice number shows "-").
 */
export function buildListInvoiceReceiptProps(apt: AppointmentRegistration): PaymentReceiptCaptureProps {
    const reg = apt.registration;
    const payment = apt.payment;
    const hasPayment = payment != null;
    const inv = hasPayment ? payment.invoice : null;

    let consultationCharges = 0;
    let subtotal = 0;
    let tax = 0;
    let totalAmount = 0;
    let invoiceNumber: string | undefined;

    if (hasPayment && inv) {
        invoiceNumber = String(inv.invoiceNumber ?? "").trim() || undefined;
        totalAmount = parseMoney(inv.amountWithTax);
        subtotal = parseMoney(inv.amountWithoutTax);
        tax = parseMoney(inv.gstAmount);
        if (subtotal === 0 && totalAmount > 0) {
            subtotal = Math.max(0, totalAmount - tax);
        }
        consultationCharges = subtotal;
    } else if (hasPayment && !inv) {
        const p = parseMoney(payment?.price);
        consultationCharges = p;
        subtotal = p;
        tax = 0;
        totalAmount = p;
    }

    const title = reg?.patientTitle?.trim();
    const nm = reg?.patientName || reg?.patient || "";
    const patientName = title ? `${title} ${nm}`.trim() : String(nm).trim() || "—";

    const billRaw = apt.appointmentDate || apt.createdAt;
    const billDate = formatBillDateDdMmYyyy(billRaw);

    const uhid = apt.uhid || reg?.uhid || "";

    const rawAddr = reg?.address;
    const street = rawAddr?.address != null ? String(rawAddr.address).trim() : "";
    const city = rawAddr?.city != null ? String(rawAddr.city).trim() : "";
    const state = rawAddr?.state != null ? String(rawAddr.state).trim() : "";
    const pinCode = rawAddr?.pinCode != null ? String(rawAddr.pinCode).trim() : "";
    const countryName =
        rawAddr?.country != null && String(rawAddr.country).trim() !== ""
            ? String(rawAddr.country).trim()
            : "India";

    let addressDisplay = "N/A";
    if (street !== "") {
        addressDisplay = pinCode !== "" ? `${street} — Pin ${pinCode}` : street;
    }

    const cityDisplay = city !== "" ? city : "N/A";
    const stateDisplay = state !== "" ? state : "N/A";

    return {
        captureId: "registration-list-invoice-capture",
        patientName,
        address: addressDisplay,
        countryName,
        cityName: cityDisplay,
        stateName: stateDisplay,
        jsHealthCardNo: uhid,
        uhid,
        invoiceNumber,
        consultationCharges,
        subtotal,
        tax,
        totalAmount,
        billDate,
        transactionId: payment?.transactionId ?? undefined,
        paymentMode: payment?.mode ?? undefined,
        gstBilling: false,
    };
}
