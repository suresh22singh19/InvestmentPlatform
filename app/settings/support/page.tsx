"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeading } from "@/components/layout/PageHeading";
import {
  FormInputField,
  FormTextareaField,
  TableSearchInput,
  Dialog,
  MessageDialog,
  Badge,
} from "@/components/ui";
import { usePermission } from "@/hooks/usePermission";
import {
  FiMessageSquare,
  FiSend,
  FiClock,
  FiCheckCircle,
  FiHelpCircle,
  FiPlusCircle,
  FiPhoneCall,
  FiShield,
  FiZap,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiPaperclip,
  FiUser,
  FiAlertCircle,
  FiMail,
} from "react-icons/fi";
import { FaCrown, FaTelegramPlane, FaWhatsapp, FaHeadset, FaWallet } from "react-icons/fa";

// ─── Support Ticket Data Types ────────────────────────────────────────────────
export type TicketPriority = "Normal" | "High" | "Urgent";
export type TicketStatus = "Open" | "In Progress" | "Resolved";

export type TicketReply = {
  id: string;
  sender: "User" | "VIP Support Specialist";
  senderName: string;
  message: string;
  timestamp: string;
};

export type SupportTicket = {
  id: string;
  subject: string;
  category: "Withdrawal / Deposit" | "Product Plans & ROI" | "Referral Commission (Levels 1-6)" | "Account Security";
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  lastUpdated: string;
  messages: TicketReply[];
};

// ─── Pre-Populated High-Yield / Gaming Platform Support Tickets ────────────────
const MOCK_TICKETS: SupportTicket[] = [
  {
    id: "TICK-8921",
    subject: "USDT Withdrawal Payout Status Confirmation",
    category: "Withdrawal / Deposit",
    priority: "Urgent",
    status: "In Progress",
    createdAt: "2026-08-11 10:30 AM",
    lastUpdated: "2026-08-11 11:15 AM",
    messages: [
      {
        id: "m1",
        sender: "User",
        senderName: "Rajesh Kumar",
        message: "Hello team, I submitted a withdrawal request of $1,450 to my USDT TRC20 wallet TX9z...kP3a9. Please confirm processing time.",
        timestamp: "2026-08-11 10:30 AM",
      },
      {
        id: "m2",
        sender: "VIP Support Specialist",
        senderName: "Alex - VIP Concierge",
        message: "Hello Rajesh, your withdrawal request of $1,450 is currently being verified by our finance department. It will be dispatched within 15-30 minutes.",
        timestamp: "2026-08-11 11:15 AM",
      },
    ],
  },
  {
    id: "TICK-8920",
    subject: "Level 4 Milestone Cash Unlock Bonus Claim",
    category: "Referral Commission (Levels 1-6)",
    priority: "High",
    status: "Open",
    createdAt: "2026-08-11 09:10 AM",
    lastUpdated: "2026-08-11 09:10 AM",
    messages: [
      {
        id: "m1",
        sender: "User",
        senderName: "Vikram Malhotra",
        message: "I reached 25 direct active referrals today for Level 4 Platinum Executive! Want to confirm when the $750 cash unlock bonus will reflect in my wallet balance.",
        timestamp: "2026-08-11 09:10 AM",
      },
    ],
  },
  {
    id: "TICK-8918",
    subject: "Gold Shareholder Plan Daily ROI Interest Query",
    category: "Product Plans & ROI",
    priority: "Normal",
    status: "Resolved",
    createdAt: "2026-08-10 02:45 PM",
    lastUpdated: "2026-08-10 03:20 PM",
    messages: [
      {
        id: "m1",
        sender: "User",
        senderName: "Anita Sharma",
        message: "Hi, I purchased the Gold Shareholder Plan ($1,000) yesterday. Does the daily 2.2% interest credit at midnight GMT?",
        timestamp: "2026-08-10 02:45 PM",
      },
      {
        id: "m2",
        sender: "VIP Support Specialist",
        senderName: "Sarah - Helpdesk Lead",
        message: "Hello Anita! Yes, daily ROI interest of $22.00 (+2.2%) is automatically credited to your withdrawable balance every 24 hours from purchase time.",
        timestamp: "2026-08-10 03:20 PM",
      },
    ],
  },
];

// ─── FAQ Knowledge Base Accordion Data ───────────────────────────────────────
const FAQ_ITEMS = [
  {
    question: "How is my daily product interest ROI calculated and credited?",
    answer: "Daily interest yield is calculated automatically based on your active purchased product plan percentage (e.g. 1.5% for Starter, 2.2% for Gold Shareholder, 3.0% for Platinum, 4.0% for VIP Diamond). ROI is credited to your withdrawable balance every 24 hours for 60 days.",
  },
  {
    question: "What are the withdrawal limits and processing times?",
    answer: "The minimum withdrawal threshold is $50.00 USD. Instant crypto withdrawals via USDT (TRC20 / BEP20) are processed within 15-30 minutes. Bank wire payouts are completed within 1-3 business hours.",
  },
  {
    question: "How do Level 1 to Level 6 Referral Rewards & Cash Unlock Bonuses work?",
    answer: "When members purchase plans through your network, you earn multi-level commissions down to Level 6 (L1: up to 12%, L2: 6%, L3: 5%, L4: 4%, L5: 3%, L6: 2%). Additionally, reaching target direct invite milestones unlocks cash bonuses up to $3,000.00 USD!",
  },
  {
    question: "How do I contact my dedicated VIP Account Manager?",
    answer: "Members holding Gold Shareholder, Platinum, or VIP Diamond tiers receive a dedicated VIP Concierge Manager available 24/7 on Telegram and WhatsApp for priority withdrawal assistance and strategy advice.",
  },
];

export default function SupportPage() {
  const supportPermission = usePermission("settings", { subModule: "support" });
  const canView = supportPermission.canView;

  // Tickets & Tab State
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);
  const [activeTab, setActiveTab] = useState<"All" | "Open" | "In Progress" | "Resolved">("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Create Ticket Dialog State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState<SupportTicket["category"]>("Withdrawal / Deposit");
  const [newPriority, setNewPriority] = useState<TicketPriority>("Normal");
  const [newDescription, setNewDescription] = useState("");

  // Inspect Ticket Modal State
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  // FAQ Expanded State
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  // Toast Notification State
  const [toastState, setToastState] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const showToast = (message: string) => {
    setToastState({ open: true, message });
  };

  // Filtered Tickets List
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (activeTab !== "All" && t.status !== activeTab) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          t.id.toLowerCase().includes(term) ||
          t.subject.toLowerCase().includes(term) ||
          t.category.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [tickets, activeTab, searchTerm]);

  // Open Ticket Creation
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) {
      showToast("Please enter a ticket subject and description.");
      return;
    }

    const createdTicket: SupportTicket = {
      id: `TICK-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: newSubject.trim(),
      category: newCategory,
      priority: newPriority,
      status: "Open",
      createdAt: "Just Now",
      lastUpdated: "Just Now",
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: "User",
          senderName: "You (Member)",
          message: newDescription.trim(),
          timestamp: "Just Now",
        },
      ],
    };

    setTickets((prev) => [createdTicket, ...prev]);
    showToast(`Support Ticket #${createdTicket.id} submitted! A VIP Specialist will respond shortly.`);
    setIsCreateDialogOpen(false);
    setNewSubject("");
    setNewDescription("");
  };

  // Submit Ticket Reply
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    const newReply: TicketReply = {
      id: `m-${Date.now()}`,
      sender: "User",
      senderName: "You (Member)",
      message: replyMessage.trim(),
      timestamp: "Just Now",
    };

    const updated = {
      ...selectedTicket,
      messages: [...selectedTicket.messages, newReply],
      lastUpdated: "Just Now",
    };

    setSelectedTicket(updated);
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setReplyMessage("");
    showToast("Reply sent to VIP Support Concierge.");
  };

  return (
    <AppShell>
      {/* Toast Alert */}
      <MessageDialog
        open={toastState.open}
        onClose={() => setToastState((p) => ({ ...p, open: false }))}
        showCancel={false}
        confirmText="OK"
        message={toastState.message}
      />

      <div className="space-y-6">
        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-950 font-black text-xs uppercase tracking-wider flex items-center gap-1">
                <FaHeadset className="text-amber-600" /> 24/7 VIP Support Concierge
              </span>
            </div>
            <PageHeading title="VIP Support & Ticket Helpdesk" />
            <p className="text-xs text-slate-500 mt-1">
              Get instant help with withdrawals, product ROI returns, level milestone bonuses, or connect with your VIP Account Manager.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex h-11 items-center justify-center gap-2 rounded-[32px] bg-slate-900 px-6 text-xs font-black text-amber-400 shadow-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <FiPlusCircle className="text-base text-amber-400" />
            <span>Create Support Ticket</span>
          </button>
        </div>

        {/* HERO BANNER & SLA METRICS */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 rounded-2xl p-6 shadow-xl border border-slate-700 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <FaHeadset className="text-9xl text-amber-400" />
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
            <div>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                ✨ PREMIUM GAMING & YIELD HELPDESK
              </span>
              <h2 className="text-2xl font-black text-white mt-2">How Can We Help You Today?</h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5 max-w-2xl">
                Our dedicated VIP support specialists and automated engines are online 24 hours a day, 7 days a week to ensure instant ticket resolution.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3.5 py-2 bg-emerald-500/20 text-emerald-400 font-black rounded-xl text-xs border border-emerald-500/30 flex items-center gap-1.5 shadow">
                <FiZap className="text-emerald-400" /> Live Chat Online
              </span>
            </div>
          </div>

          {/* SLA Performance Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Avg. Response SLA</span>
              <span className="text-lg font-black text-amber-400 mt-0.5 block flex items-center gap-1">
                <FiClock /> &lt; 2 Minutes
              </span>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Ticket Resolution</span>
              <span className="text-lg font-black text-emerald-400 mt-0.5 block flex items-center gap-1">
                <FiCheckCircle /> 99.8% Success
              </span>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">VIP Coverage</span>
              <span className="text-lg font-black text-white mt-0.5 block flex items-center gap-1">
                <FaCrown className="text-amber-400" /> 24/7 Priority
              </span>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Security Protocol</span>
              <span className="text-lg font-black text-amber-300 mt-0.5 block flex items-center gap-1">
                <FiShield /> 100% Encrypted
              </span>
            </div>
          </div>
        </div>

        {/* 4 SUPPORT CHANNELS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: 24/7 Live Chat */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 hover:border-amber-400 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 font-black flex items-center justify-center mb-3">
                <FiMessageSquare className="text-2xl" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">24/7 Live Chat Concierge</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Instant real-time chat assistance with support specialists.</p>
            </div>
            <button
              type="button"
              onClick={() => showToast("Opening 24/7 Live Chat widget...")}
              className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs rounded-xl transition-colors shadow flex items-center justify-center gap-2"
            >
              <FiZap className="text-amber-400" /> Start Live Chat
            </button>
          </div>

          {/* Card 2: Official Telegram Channel */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 hover:border-blue-400 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-900 font-black flex items-center justify-center mb-3">
                <FaTelegramPlane className="text-2xl text-blue-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Official Telegram VIP Channel</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Join 45,000+ members for daily yield updates & community perks.</p>
            </div>
            <button
              type="button"
              onClick={() => showToast("Redirecting to Telegram VIP Channel...")}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-colors shadow flex items-center justify-center gap-2"
            >
              <FaTelegramPlane className="text-white" /> Join Telegram VIP
            </button>
          </div>

          {/* Card 3: VIP Dedicated Manager */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 hover:border-emerald-400 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-900 font-black flex items-center justify-center mb-3">
                <FaWhatsapp className="text-2xl text-emerald-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">VIP Account Manager</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Dedicated 1-on-1 concierge for Gold Shareholder & VIP tiers.</p>
            </div>
            <button
              type="button"
              onClick={() => showToast("Connecting to Dedicated VIP Manager via WhatsApp...")}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-colors shadow flex items-center justify-center gap-2"
            >
              <FaWhatsapp className="text-white" /> WhatsApp Concierge
            </button>
          </div>

          {/* Card 4: Ticket Helpdesk */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 hover:border-indigo-400 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-900 font-black flex items-center justify-center mb-3">
                <FiMail className="text-2xl text-indigo-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Submit Ticket Helpdesk</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Submit detailed technical or payout inquiry support tickets.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
              className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs rounded-xl transition-colors shadow flex items-center justify-center gap-2"
            >
              <FiPlusCircle className="text-amber-400" /> Open New Ticket
            </button>
          </div>
        </div>

        {/* TICKET MANAGEMENT HUB */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FiMessageSquare className="text-amber-500" /> Your Support Tickets
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Track ticket responses and communicate with support specialists.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Status Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {(["All", "Open", "In Progress", "Resolved"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === tab
                        ? "bg-slate-900 text-amber-400 shadow"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <TableSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search ticket ID or subject..."
                className="!w-[220px] min-w-[220px] shrink-0"
              />
            </div>
          </div>

          {/* Tickets List Table */}
          {filteredTickets.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              No support tickets found matching your filter criteria.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-amber-400 font-black text-[11px] uppercase">
                  <tr>
                    <th className="p-3.5">Ticket ID</th>
                    <th className="p-3.5">Subject</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Priority</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Last Updated</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-800">
                  {filteredTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono font-extrabold text-slate-900">{t.id}</td>
                      <td className="p-3.5 font-bold text-slate-900 max-w-[220px] truncate">{t.subject}</td>
                      <td className="p-3.5 text-slate-600">{t.category}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            t.priority === "Urgent"
                              ? "bg-rose-100 text-rose-700"
                              : t.priority === "High"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            t.status === "Resolved"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : t.status === "In Progress"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-blue-100 text-blue-800 border border-blue-300"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{t.lastUpdated}</td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(t)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-black transition-colors shadow"
                        >
                          Inspect Ticket
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FAQ KNOWLEDGE BASE ACCORDION */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <FiHelpCircle className="text-amber-500" /> Frequently Asked Questions (FAQ)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Quick answers to common questions about payouts, plans, and referral rewards.</p>
            </div>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, index) => {
              const isExpanded = expandedFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaqIndex(isExpanded ? null : index)}
                    className="w-full p-4 text-left font-black text-sm text-slate-900 flex justify-between items-center hover:bg-slate-100 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isExpanded ? <FiChevronUp className="text-amber-600 text-lg" /> : <FiChevronDown className="text-slate-400 text-lg" />}
                  </button>
                  {isExpanded && (
                    <div className="p-4 bg-white border-t border-slate-200 text-xs text-slate-600 font-medium leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CREATE NEW SUPPORT TICKET DIALOG */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        title="Submit New VIP Support Ticket"
        width={680}
        closeOnOutsideClick={false}
      >
        <form noValidate className="space-y-4 text-xs" onSubmit={handleCreateTicket}>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div>
              <FormInputField
                label="Ticket Subject *"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. USDT Withdrawal Payout Status Confirmation"
                height={42}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as SupportTicket["category"])}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Withdrawal / Deposit">Withdrawal / Deposit</option>
                  <option value="Product Plans & ROI">Product Plans & ROI</option>
                  <option value="Referral Commission (Levels 1-6)">Referral Commission (Levels 1-6)</option>
                  <option value="Account Security">Account Security</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority Level *</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent (VIP Priority)</option>
                </select>
              </div>
            </div>

            <div>
              <FormTextareaField
                label="Detailed Description *"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Please describe your issue or query in detail..."
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateDialogOpen(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl shadow-lg transition-colors text-xs"
            >
              Submit Ticket to VIP Concierge
            </button>
          </div>
        </form>
      </Dialog>

      {/* INSPECT TICKET & REPLY DIALOG */}
      <Dialog
        open={selectedTicket !== null}
        onClose={() => setSelectedTicket(null)}
        title={`Support Ticket Thread: ${selectedTicket?.id || ""}`}
        width={750}
        closeOnOutsideClick={false}
      >
        {selectedTicket && (
          <div className="space-y-4 text-xs">
            {/* Header Ticket Info */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="px-2.5 py-0.5 bg-amber-500 text-slate-900 rounded font-black text-[10px] uppercase">
                  {selectedTicket.category}
                </span>
                <h3 className="text-base font-black text-white mt-1">{selectedTicket.subject}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Created: {selectedTicket.createdAt}</p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    selectedTicket.status === "Resolved"
                      ? "bg-emerald-500 text-white"
                      : selectedTicket.status === "In Progress"
                      ? "bg-amber-500 text-slate-900"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {selectedTicket.status}
                </span>
              </div>
            </div>

            {/* Conversation Messages Thread */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-h-[320px] overflow-y-auto space-y-3">
              {selectedTicket.messages.map((msg) => {
                const isUser = msg.sender === "User";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-500 font-bold">
                      <span>{msg.senderName}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div
                      className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                        isUser
                          ? "bg-slate-900 text-white rounded-tr-none shadow-sm"
                          : "bg-amber-100 text-amber-950 border border-amber-200 rounded-tl-none font-medium"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit Follow-up Reply Form */}
            <form onSubmit={handleSendReply} className="space-y-3 pt-1">
              <FormTextareaField
                label="Reply to VIP Support Concierge"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply or additional details here..."
                rows={2}
              />

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...selectedTicket, status: "Resolved" as const };
                    setSelectedTicket(updated);
                    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                    showToast(`Ticket #${selectedTicket.id} marked as RESOLVED.`);
                  }}
                  className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold rounded-xl transition-colors text-xs"
                >
                  Mark as Resolved
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl transition-colors text-xs flex items-center gap-1.5 shadow"
                  >
                    <FiSend /> Send Reply
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </Dialog>
    </AppShell>
  );
}
