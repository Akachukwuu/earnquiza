import { useState } from "react";
import { ArrowLeft, CreditCard } from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { supabase } from "../lib/supabase";

interface DepositProps {
  onBack: () => void;
}

declare global {
  interface Window {
    FlutterwaveCheckout: any;
  }
}

export function Deposit({ onBack }: DepositProps) {
  const { userData, refetch } = useUserData();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  // ✅ Dynamically load Flutterwave script
  const loadFlutterwave = () => {
    return new Promise<void>((resolve, reject) => {
      if (document.getElementById("flw-script")) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.id = "flw-script";
      script.src = "https://checkout.flutterwave.com/v3.js";
      script.onload = () => resolve();
      script.onerror = () => reject("Failed to load Flutterwave script");
      document.body.appendChild(script);
    });
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatusMsg("");

    if (!userData) {
      setError("User data not found.");
      setLoading(false);
      return;
    }

    try {
      await loadFlutterwave();

      if (!window.FlutterwaveCheckout) {
        setError("Flutterwave not loaded. Please refresh and try again.");
        setLoading(false);
        return;
      }

      const tx_ref = `ctoe_${Date.now()}`;
      setStatusMsg("Opening secure payment window...");

      // ✅ Initialize Flutterwave Checkout
      window.FlutterwaveCheckout({
        public_key: import.meta.env.VITE_FLW_PUBLIC_KEY,
        tx_ref,
        amount: Number(amount),
        currency: "NGN",
        payment_options: "card, banktransfer, ussd",
        customer: {
          email: userData.email,
          name: userData.email.split("@")[0], // use email prefix as name
        },

        customizations: {
          title: "Boost PTs",
          description: "Increase your earning power by 35%",
          logo: "/logo.png",
        },
        callback: async (response: any) => {
          setStatusMsg("Verifying payment...");

          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            const verifyRes = await fetch(
              "https://lrrnifropjmdsgscoecr.supabase.co/functions/v1/verify-payment",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session?.access_token ?? ""}`, // ✅ include user JWT
                },
                body: JSON.stringify({
                  tx_ref,
                  transaction_id: response.transaction_id,
                  user_id: userData.id,
                }),
              }
            );

            const verifyJson = await verifyRes.json();

            if (verifyJson.verified) {
              setStatusMsg("✅ Deposit successful! Earn rate increased.");
              await refetch();
              setAmount("");
              setTimeout(() => setStatusMsg(""), 4000);
            } else {
              setError(
                "Verification failed: " + (verifyJson.reason || "unknown error")
              );
            }
          } catch (err) {
            console.error("Verify error:", err);
            setError("Failed to verify payment. Please contact support.");
          } finally {
            setLoading(false);
          }
        },
        onclose: () => {
          setStatusMsg("");
          setLoading(false);
        },
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error loading payment gateway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <CreditCard className="text-blue-400" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Deposit Amount</h1>
              <p className="text-gray-400 text-sm">Add money to your account</p>
            </div>
          </div>

          <form onSubmit={handleDeposit} className="space-y-6">
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Amount (₦)
              </label>
              <input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-lg"
                placeholder="0.00"
              />
            </div>

            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
              <p className="text-blue-300 text-sm mb-2">
                <strong>Bonus:</strong> Each deposit increases your PT rate by
                35%!
              </p>
              {userData && (
                <p className="text-blue-400 text-xs">
                  Current rate:
                  {parseFloat(userData.earn_rate.toString()).toFixed(2)} PTs →
                  New rate:
                  {(parseFloat(userData.earn_rate.toString()) * 1.35).toFixed(
                    2
                  )}{" "}
                  PTs
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {statusMsg && (
              <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm">
                {statusMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
            >
              {loading ? "Processing..." : "💳 Deposit Now"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">
              Quick Amount
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[100, 1000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset.toString())}
                  className="py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-medium"
                >
                  ₦{preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
