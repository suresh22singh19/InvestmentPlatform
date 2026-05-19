import html2pdf from "html2pdf.js";

/**
 * Clone a receipt DOM node (by id) and save as PDF — same pipeline as payment.tsx handleDownloadInvoice.
 */
export async function downloadPaymentReceiptPdfFromElement(
    captureElementId: string,
    filenameBase: string,
): Promise<void> {
    const el = document.getElementById(captureElementId);
    if (!el || !(el instanceof HTMLElement)) {
        return;
    }
    const exportWidthPx = Math.max(Math.round(el.getBoundingClientRect().width), 320);
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = [
        "position:fixed",
        "left:-99999px",
        "top:0",
        `width:${exportWidthPx}px`,
        "margin:0",
        "padding:0",
        "background:#ffffff",
        "box-sizing:border-box",
        "overflow:visible",
        "pointer-events:none",
    ].join(";");

    const clone = el.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    clone.style.width = "100%";
    clone.style.maxWidth = "100%";
    clone.style.boxSizing = "border-box";
    clone.style.margin = "0";
    host.appendChild(clone);
    document.body.appendChild(host);

    const safeName = filenameBase?.trim() ? filenameBase.trim().replace(/[^\w.-]+/g, "_") : "receipt";
    const filename = `Payment-Receipt-${safeName}.pdf`;

    try {
        void host.offsetWidth;
        const imgs = Array.from(clone.querySelectorAll("img"));
        await Promise.all(
            imgs.map(
                (img) =>
                    new Promise<void>((resolve) => {
                        if (img.complete && img.naturalWidth > 0) {
                            resolve();
                            return;
                        }
                        img.addEventListener("load", () => resolve(), { once: true });
                        img.addEventListener("error", () => resolve(), { once: true });
                    }),
            ),
        );
        for (const img of imgs) {
            try {
                await img.decode();
            } catch {
                /* ignore */
            }
        }
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

        const blobUrl = await html2pdf()
            .set({
                margin: 8,
                filename,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    foreignObjectRendering: false,
                    imageTimeout: 15_000,
                    logging: false,
                    backgroundColor: "#ffffff",
                    onclone: (_clonedDoc: Document, clonedRoot: HTMLElement) => {
                        clonedRoot.style.overflow = "visible";
                        clonedRoot.style.clipPath = "none";
                        clonedRoot.style.boxSizing = "border-box";
                        clonedRoot.style.border = "1px solid #C0C3C8";
                        clonedRoot.style.backgroundColor = "#ffffff";
                    },
                },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            })
            .from(clone)
            .outputPdf("bloburl");
        window.open(blobUrl, "_blank");
    } finally {
        host.remove();
    }
}
