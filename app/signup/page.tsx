"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Input } from "@/components/ui/Input";
import { MessageDialog } from "@/components/ui/MessageDialog";
import { FaCrown, FaUserPlus, FaLock, FaGift } from "react-icons/fa";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCodeParam = searchParams?.get("ref") || "";

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    referralCode: refCodeParam || "DVENTURES-8888",
    agreeTerms: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate registration submission
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccessModal(true);
    }, 900);
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Background Ambient Spotlights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[540px] relative z-10">
        {/* Dark Glass Card Container */}
        <div className="p-8 md:p-10 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
          {/* Logo Badge */}
          <div className="flex justify-center mb-6">
            <Logo />
          </div>

          <div className="mb-8 text-center">
            <span className="px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
              <FaCrown className="text-amber-400 text-xs" /> VIP Registration
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Join DVentures Network
            </h1>
            <p className="text-sm text-slate-400 font-medium mt-1">
              Unlock 12% multi-level referral commissions & daily yield returns
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <Input
              label="Full Name"
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter your full name..."
            />

            {/* Email Address */}
            <Input
              label="Email Address"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email ID..."
            />

            {/* Phone Number */}
            <Input
              label="Phone Number / WhatsApp"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
            />

            {/* Password & Confirm Password Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create password..."
              />
              <Input
                label="Confirm Password"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm password..."
              />
            </div>

            {/* Referral Code (Optional) */}
            <div className="relative">
              <Input
                label="Referral Code (Optional)"
                type="text"
                value={formData.referralCode}
                onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                placeholder="e.g. DVENTURES-8888"
              />
              <span className="absolute right-3 top-9 text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                + $15 Bonus
              </span>
            </div>

            {/* Terms & Conditions Checkbox */}
            <div className="flex items-start gap-2.5 pt-2">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={formData.agreeTerms}
                onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-amber-400 focus:ring-amber-400/40 cursor-pointer"
              />
              <label htmlFor="agreeTerms" className="text-xs text-slate-300 font-medium cursor-pointer leading-tight">
                I agree to the <span className="text-amber-400 font-bold hover:underline">Terms of Service</span>, <span className="text-amber-400 font-bold hover:underline">VIP Yield Policy</span> & <span className="text-amber-400 font-bold hover:underline">Privacy Policy</span>.
              </label>
            </div>

            {/* Create Account Action Button */}
            <button
              type="submit"
              disabled={isLoading || !formData.agreeTerms}
              className="w-full mt-6 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-slate-950 font-black text-base tracking-wide shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-yellow-300 transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-slate-950 border-t-transparent" />
              ) : (
                <>
                  <FaUserPlus className="text-slate-950 text-base" /> Create VIP Account
                </>
              )}
            </button>
          </form>

          {/* Back to Sign In Link */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <span className="text-sm text-slate-400 font-medium">Already have an account? </span>
            <Link
              href="/"
              className="text-amber-400 font-extrabold hover:text-amber-300 text-sm inline-block transition-colors underline cursor-pointer ml-1"
            >
              Sign In Here
            </Link>
          </div>
        </div>
      </div>

      {/* Registration Success Modal */}
      <MessageDialog
        open={showSuccessModal}
        onClose={handleSuccessClose}
        message="VIP Shareholder Account Created Successfully! Welcome to DVentures."
        confirmText="Proceed to Sign In"
        showCancel={false}
        onConfirm={handleSuccessClose}
      />
    </div>
  );
}
