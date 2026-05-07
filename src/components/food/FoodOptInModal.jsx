import { useState } from 'react';
import { UtensilsCrossed, X } from 'lucide-react';

export default function FoodOptInModal({ onConfirm, onDecline, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <UtensilsCrossed size={28} className="text-white" />
          </div>
          <h2 className="text-lg font-black tracking-tight">Food Request Program</h2>
          <p className="text-indigo-200 text-[12px] mt-1 font-medium">Daily Meal Subscription</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-slate-700 text-[13px] font-medium text-center leading-relaxed">
            Would you like to opt into the company food request program?
          </p>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-600 font-medium">Cost per working day</span>
              <span className="font-black text-indigo-700">₹30 / day</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-600 font-medium">Working days</span>
              <span className="font-black text-slate-700">Mon – Saturday (excl. holidays and 2nd and 4th Saturdays)</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-600 font-medium">Subscription starts</span>
              <span className="font-black text-indigo-700">From next Monday</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-600 font-medium">Cancellation window</span>
              <span className="font-black text-slate-700">Before Saturday 6:30 PM</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-600 font-medium">Valid until</span>
              <span className="font-black text-slate-700">Until account deactivation</span>
            </div>
          </div>

          <p className="text-slate-400 text-[11px] text-center">
            Opting in mid-week? Your meals begin from next Monday. Changes can be made or undone before Saturday 6:30 PM each week.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onDecline}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-[12px] hover:bg-slate-50 transition-all active:scale-95"
          >
            Not Now
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[12px] shadow-md transition-all active:scale-95 disabled:opacity-60"
          >
            {loading ? 'Opting in...' : 'Yes, Opt In'}
          </button>
        </div>
      </div>
    </div>
  );
}
