import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface WithdrawRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  user: {
    email: string;
    account_name: string | null;
    account_number: string | null;
    bank_name: string | null;
  };
}

export function AdminPanel() {
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  // ✅ Fetch withdrawals with user info
  const fetchWithdrawals = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("withdraw_requests")
      .select(
        `
        id,
        amount,
        status,
        created_at,
        user:users(email, account_name, account_number, bank_name)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Failed to load withdrawals.");
    } else {
      setWithdrawals(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  // ✅ Approve or reject a withdrawal
  const handleStatusUpdate = async (
    id: string,
    newStatus: "paid" | "rejected"
  ) => {
    setUpdating(id);

    const { error } = await supabase
      .from("withdraw_requests")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Failed to update status");
    } else {
      setWithdrawals((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: newStatus } : req))
      );
    }

    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-400">
        <Loader2 className="animate-spin mr-2" /> Loading withdrawal requests...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="overflow-x-auto bg-gray-800 border border-gray-700 rounded-xl shadow-lg">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-700 text-gray-300">
                <th className="px-4 py-3 text-left">User Email</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Account Name</th>
                <th className="px-4 py-3 text-left">Account Number</th>
                <th className="px-4 py-3 text-left">Bank</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-500">
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                withdrawals.map((req) => (
                  <tr
                    key={req.id}
                    className="border-t border-gray-700 hover:bg-gray-700/30 transition"
                  >
                    <td className="px-4 py-3">{req.user?.email || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-green-400">
                      ₦{Number(req.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {req.user?.account_name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {req.user?.account_number || "-"}
                    </td>
                    <td className="px-4 py-3">{req.user?.bank_name || "-"}</td>
                    <td className="px-4 py-3">
                      {req.status === "pending" && (
                        <span className="text-yellow-400 font-medium">
                          Pending
                        </span>
                      )}
                      {req.status === "paid" && (
                        <span className="text-green-400 font-medium">Paid</span>
                      )}
                      {req.status === "rejected" && (
                        <span className="text-red-400 font-medium">
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(req.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      {req.status === "pending" ? (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(req.id, "paid")}
                            disabled={!!updating}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition disabled:opacity-50"
                          >
                            {updating === req.id ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                            Mark as Paid
                          </button>
                          <button
                            onClick={() =>
                              handleStatusUpdate(req.id, "rejected")
                            }
                            disabled={!!updating}
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition disabled:opacity-50"
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-400">No action</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
