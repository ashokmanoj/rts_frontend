import { useState } from "react";
import { Link }     from "react-router-dom";
import { login, selectRole } from "../services/authService";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import InstructionsModal from "../components/modals/InstructionsModal";

const ROLE_LABELS = {
  Requestor:     "Requestor",
  RM:            "Reporting Manager",
  HOD:           "Head of Department",
  DeptHOD:       "Department HOD",
  Management:    "Management",
  Admin:         "Admin",
  HR:            "HR",
  FoodCommittee: "Food Committee",
};

export default function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // Role selection state (multi-role users only)
  const [showPassword, setShowPassword] = useState(false);
  const [pending,      setPending]      = useState(null);
  const [selecting,    setSelecting]    = useState(false);
  const [showGuide,    setShowGuide]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result?.needsRoleSelection) {
        setPending(result);
      } else {
        onLogin(result);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = async (role, dept) => {
    setError("");
    setSelecting(true);
    try {
      const user = await selectRole(pending.tempToken, role, dept);
      onLogin(user);
    } catch (err) {
      setError(err.response?.data?.error || "Role selection failed. Please try again.");
      setPending(null);
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 font-sans p-4">

      {/* Help / User Guide button */}
      <button
        onClick={() => setShowGuide(true)}
        title="Open Login User Guide"
        className="fixed top-6 right-6 z-50 h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center gap-2 text-[12px] font-black transition-all hover:scale-105 active:scale-95"
      >
        <ShieldCheck size={15} /> Login User Guide
      </button>

      {showGuide && (
        <InstructionsModal
          onClose={() => setShowGuide(false)}
          pdfSrc="/RTS-Login-Guide.pdf"
          downloadName="RTS-Login-Guide.pdf"
          title="Login & Account Access Guide"
          subtitle="Step-by-Step Visual Guide"
        />
      )}

      <div className="w-full max-w-md">
        <div className="bg-white shadow-2xl rounded-3xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 sm:p-8 text-center">
            <h1 className="text-3xl font-black text-white tracking-tight">TELE-RTS</h1>
            <p className="text-indigo-200 text-sm mt-1 font-medium">
              {pending ? "Select your active role" : "Tele Education Portal ( Internal Use Only )"}
            </p>
          </div>

          

          <div className="p-5 sm:p-8 space-y-4">
            {/* ── Role selection screen ─────────────────────────────────────── */}
            {pending ? (
              <div className="space-y-3">
                <p className="text-slate-500 text-sm text-center">
                  Your account has multiple roles. Choose how you'd like to work today.
                </p>
                {pending.availableRoles.map(({ role, dept }) => (
                  <button
                    key={`${role}-${dept}`}
                    onClick={() => handleSelectRole(role, dept)}
                    disabled={selecting}
                    className="w-full flex flex-col items-start gap-0.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-400 rounded-2xl px-5 py-4 transition-all disabled:opacity-60 text-left"
                  >
                    <span className="text-sm font-bold text-indigo-700">
                      {ROLE_LABELS[role] || role}
                    </span>
                    <span className="text-xs text-slate-500">{dept} Department</span>
                  </button>
                ))}
                {error && (
                  <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-xl">{error}</p>
                )}
                <button
                  onClick={() => { setPending(null); setError(""); }}
                  className="w-full text-slate-500 hover:text-slate-700 text-sm font-medium pt-1 transition-colors"
                >
                  Back to login
                </button>
              </div>
            ) : (
              /* ── Login form ───────────────────────────────────────────────── */
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text" placeholder="Enter factohr email address" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password" value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {error && (
                  <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-3 rounded-xl">{error}</p>
                )}
                <button type="submit" disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95">
                  {loading ? "Logging in..." : "Login"}
                </button>

                <div className="text-center">
                  <Link
                    to="/forgot-password"
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
