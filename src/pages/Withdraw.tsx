import { useState } from "react";
import { ArrowLeft, Wallet } from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { supabase } from "../lib/supabase";

interface WithdrawProps {
  onBack: () => void;
}

interface ExtendedUserData {
  id: string;
  email: string;
  balance: number;
  earn_rate: number;
  account_name?: string | null;
  account_number?: string | null;
  bank_name?: string | null;
}

export function Withdraw({ onBack }: WithdrawProps) {
  const { userData, refetch } = useUserData();
  const user = userData as ExtendedUserData;

  const [amount, setAmount] = useState("");
  const [accountName, setAccountName] = useState(user?.account_name || "");
  const [accountNumber, setAccountNumber] = useState(
    user?.account_number || ""
  );
  const [bankName, setBankName] = useState(user?.bank_name || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!user) {
      setError("User data not found");
      return;
    }

    const withdrawAmount = parseFloat(amount);
    const currentBalance = parseFloat(user.balance.toString());

    if (withdrawAmount > currentBalance) {
      setError("Insufficient balance");
      return;
    }

    if (withdrawAmount < 100) {
      setError("Minimum withdrawal is 100.00 PTs");
      return;
    }

    setLoading(true);

    try {
      const newBalance = currentBalance - withdrawAmount;

      // ✅ Step 1: Update user info and deduct balance
      const { error: updateError } = await supabase
        .from("users")
        .update({
          balance: newBalance,
          account_name: accountName,
          account_number: accountNumber,
          bank_name: bankName,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // ✅ Step 2: Create withdraw request record for admin panel
      const { error: insertError } = await supabase
        .from("withdraw_requests")
        .insert([
          {
            user_id: user.id,
            amount: withdrawAmount,
            status: "pending", // 👈 default
          },
        ]);

      if (insertError) throw insertError;

      setSuccess(true);
      await refetch();

      setTimeout(() => {
        setSuccess(false);
        setAmount("");
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process withdrawal");
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
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Wallet className="text-purple-400" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Withdraw Funds</h1>
              <p className="text-gray-400 text-sm">
                Transfer to your bank account
              </p>
            </div>
          </div>

          {user && (
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
              <p className="text-gray-400 text-sm">Available Balance</p>
              <p className="text-2xl font-bold text-white">
                {parseFloat(user.balance.toString()).toFixed(2)} PTs
              </p>
            </div>
          )}

          <form onSubmit={handleWithdraw} className="space-y-6">
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Withdrawal Amount (PT)
              </label>
              <input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition text-lg"
                placeholder="0.00"
              />
            </div>

            <div>
              <label
                htmlFor="accountName"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Account Name
              </label>
              <input
                id="accountName"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label
                htmlFor="accountNumber"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Account Number
              </label>
              <input
                id="accountNumber"
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                pattern="[0-9]{10}"
                maxLength={10}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                placeholder="0123456789"
              />
              <p className="text-gray-500 text-xs mt-1">
                10-digit account number
              </p>
            </div>

            <div>
              <label
                htmlFor="bankName"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Bank Name
              </label>
              <input
                id="bankName"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                placeholder="First Bank"
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm">
                Withdrawal request successful! {amount} PTs deducted from your
                balance.
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
            >
              {loading ? "Processing..." : "Withdraw Now"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
