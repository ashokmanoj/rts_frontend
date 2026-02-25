import React from "react";
import { Plus } from "lucide-react";

const LoginPage = ({ onLogin }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f1f5f9] font-sans">
      <div className="w-full max-w-md p-10 bg-white shadow-2xl rounded-3xl border border-slate-200">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg">
            <Plus className="text-white transform rotate-45" size={32} />
          </div>
        </div>
        <h1 className="text-3xl font-black text-center mb-2 text-slate-800 tracking-tight">
          RTS SYSTEM
        </h1>
        <p className="text-center text-slate-500 mb-8 text-sm">
          Enter your credentials to access the portal
        </p>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username / Email"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          <button
            onClick={onLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

// This is the line that clears your error!
export default LoginPage;