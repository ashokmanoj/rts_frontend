import { useState } from "react";
import { Link }     from "react-router-dom";
import { forgotPassword } from "../services/authService";
import { ArrowLeft, Mail, CheckCircle2, Clock, ShieldAlert } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email,        setEmail]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [error,        setError]        = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsRateLimited(false);
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (err) {
      if (err.response?.status === 429) {
        setIsRateLimited(true);
        setError(err.response?.data?.error || "Too many attempts. Please try again later.");
      } else {
        setError(err.response?.data?.error || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 font-sans p-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-2xl rounded-3xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-8 text-center">
            <h1 className="text-3xl font-black text-white tracking-tight">TELE-RTS</h1>
            <p className="text-indigo-200 text-sm mt-1 font-medium">Password Recovery</p>
          </div>

          <div className="p-8 space-y-5">
            {submitted ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={30} className="text-green-600" />
                </div>
                <div>
                  <p className="font-black text-slate-800 text-[15px]">Check your email</p>
                  <p className="text-slate-500 text-sm mt-1">
                    If <span className="font-semibold text-slate-700">{email}</span> is registered,
                    you'll receive a reset link shortly. It expires in <strong>1 hour</strong>.
                  </p>
                </div>
                <p className="text-xs text-slate-400">Didn't receive it? Check your spam folder.</p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors"
                >
                  <ArrowLeft size={14} /> Back to login
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail size={22} className="text-indigo-600" />
                  </div>
                  <p className="font-black text-slate-800 text-[15px]">Forgot your password?</p>
                  <p className="text-slate-500 text-sm">Enter your email and we'll send you a reset link.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  />
                  {error && (
                    isRateLimited ? (
                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ShieldAlert size={16} className="text-amber-600" />
                        </div>
                        <div>
                          <p className="font-black text-amber-800 text-sm">Too Many Attempts</p>
                          <p className="text-amber-700 text-xs mt-1 leading-relaxed">{error}</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Clock size={11} className="text-amber-500" />
                            <span className="text-[11px] text-amber-600 font-semibold">Please wait before trying again</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-xl">{error}</p>
                    )
                  )}
                  <button
                    type="submit"
                    disabled={loading || isRateLimited}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95"
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-semibold transition-colors"
                  >
                    <ArrowLeft size={14} /> Back to login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
