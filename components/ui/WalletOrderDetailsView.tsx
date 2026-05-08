"use client";

import { BackToPreviousPageButton } from "./Buttons";
import { Table, TableBody, TableData, TableHead, TableHeader, TableRow } from "./Table";

export type WalletOrderDetailRecord = Record<string, string | null | undefined>;
export type WalletOrderDetailItemRecord = Record<string, string | null | undefined>;

interface WalletOrderDetailsViewProps {
    order: WalletOrderDetailRecord | null;
    items: WalletOrderDetailItemRecord[];
    isLoading: boolean;
    error: string | null;
    onBack: () => void;
}

const asDisplay = (value: string | null | undefined): string => {
    const normalized = String(value ?? "").trim();
    return normalized.length > 0 ? normalized : "N/A";
};

const customerFields: Array<{ label: string; key: string }> = [
    { label: "Order ID", key: "id" },
    { label: "Branch", key: "branch_name" },
    { label: "Patient UHID", key: "patient_uhid" },
    { label: "Name", key: "customer_name" },
    { label: "Contact No.", key: "contact_no" },
    { label: "Address", key: "address" },
    { label: "Gender", key: "gender" },
    { label: "Age", key: "age" },
    { label: "State", key: "state" },
    { label: "District", key: "district" },
    { label: "Tehsil", key: "tehsil" },
    { label: "Area", key: "area" },
    { label: "Pin Code", key: "pin_code" },
    { label: "Created At", key: "created_at" },
];

const orderFields: Array<{ label: string; key: string }> = [
    { label: "Quantity", key: "quantity" },
    { label: "Order Price", key: "order_price" },
    { label: "Discount", key: "discount" },
    { label: "Arogya Points", key: "arogya_points" },
    { label: "Advance Amount", key: "advance_amount" },
    { label: "Received Amount", key: "recieved_amount" },
    { label: "Due Amount", key: "due_amount" },
    { label: "Delivery Charges", key: "delivery_charges" },
    { label: "Transaction ID", key: "serial_no" },
    { label: "Payment Mode", key: "payment_mode" },
    { label: "Payment Method", key: "payment_method" },
    { label: "Payment Date", key: "payment_date" },
    { label: "Delivery For", key: "sell_type" },
    { label: "Order Type", key: "order_type" },
    { label: "Patient Type", key: "patient_type" },
    { label: "Delivery Status", key: "delivery_status" },
];

export function WalletOrderDetailsView({ order, items, isLoading, error, onBack }: WalletOrderDetailsViewProps) {
    return (
        <div className="space-y-4 rounded-[20px] border border-[#E3EEE1] bg-white p-6">
            <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-[#262D3B]">Order Details Information</h3>
                <BackToPreviousPageButton text="Back to Wallet" onClick={onBack} />
            </div>

            {isLoading ? <p className="text-sm text-[#6B7280]">Loading order details...</p> : null}
            {error ? <p className="text-sm text-[#B42318]">{error}</p> : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="overflow-hidden rounded-[12px] border border-[#E3EEE1]">
                    <p className="border-b border-[#E3EEE1] px-4 py-3 text-sm font-semibold text-[#262D3B]">Customer Details</p>
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            {customerFields.map((field) => (
                                <tr key={field.key} className="border-b border-[#EEF2F6] last:border-b-0">
                                    <td className="w-[40%] bg-[#F8FAFC] px-4 py-2 text-[#344054]">{field.label}</td>
                                    <td className="px-4 py-2 text-[#667085]">{asDisplay(order?.[field.key])}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="overflow-hidden rounded-[12px] border border-[#E3EEE1]">
                    <p className="border-b border-[#E3EEE1] px-4 py-3 text-sm font-semibold text-[#262D3B]">Order Details</p>
                    <table className="w-full border-collapse text-sm">
                        <tbody>
                            {orderFields.map((field) => (
                                <tr key={field.key} className="border-b border-[#EEF2F6] last:border-b-0">
                                    <td className="w-[40%] bg-[#F8FAFC] px-4 py-2 text-[#344054]">{field.label}</td>
                                    <td className="px-4 py-2 text-[#667085]">{asDisplay(order?.[field.key])}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="overflow-hidden rounded-[12px] border border-[#E3EEE1]">
                <p className="border-b border-[#E3EEE1] px-4 py-3 text-sm font-semibold text-[#262D3B]">Payment Method</p>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-white">
                            <TableHead position="first">Payment Mode</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead position="last">Transaction Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableData>{asDisplay(order?.payment_mode)}</TableData>
                            <TableData>{asDisplay(order?.payment_method)}</TableData>
                            <TableData>{asDisplay(order?.serial_no)}</TableData>
                            <TableData>{asDisplay(order?.recieved_amount)}</TableData>
                            <TableData>{asDisplay(order?.payment_date)}</TableData>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <div className="overflow-hidden rounded-[12px] border border-[#E3EEE1]">
                <p className="border-b border-[#E3EEE1] px-4 py-3 text-sm font-semibold text-[#262D3B]">Order Product Detail</p>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-white">
                            <TableHead position="first">Order ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Product ID</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Final Price</TableHead>
                            <TableHead position="last">Barcode</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableData colSpan={8} className="py-10 text-center text-sm text-[#9FA2AB]">
                                    N/A
                                </TableData>
                            </TableRow>
                        ) : (
                            items.map((item, index) => (
                                <TableRow key={`wallet-order-item-${index}`}>
                                    <TableData>{asDisplay(item.order_id)}</TableData>
                                    <TableData>{asDisplay(item.medicine_name)}</TableData>
                                    <TableData>{asDisplay(item.product_id)}</TableData>
                                    <TableData>{asDisplay(item.price)}</TableData>
                                    <TableData>{asDisplay(item.quantity)}</TableData>
                                    <TableData>{asDisplay(item.discount)}</TableData>
                                    <TableData>{asDisplay(item.final_price)}</TableData>
                                    <TableData>{asDisplay(item.barcode)}</TableData>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
