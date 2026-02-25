import React from "react";
import { X } from "lucide-react";

const ApprovalModal = ({ selectedReq, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 p-8 space-y-6 text-center">
        <h3 className="font-black text-2xl text-slate-800 uppercase tracking-tighter">
          Approval Status
        </h3>
        <p className="text-slate-500 text-sm">
          Request ID: #{selectedReq?.id} - {selectedReq?.name}
        </p>

        <div className={`px-10 py-4 rounded-2xl font-black text-2xl uppercase shadow-sm border-2 inline-block mx-auto ${
          selectedReq?.rmStatus === "Approved" 
          ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
          : "bg-red-50 text-red-600 border-red-200"
        }`}>
          {selectedReq?.rmStatus}
        </div>

        <div className="space-y-2 text-left">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
            Official Comments
          </span>
          <div className="w-full border-4 border-slate-50 p-6 rounded-3xl min-h-[120px] bg-slate-50 font-medium text-slate-700 italic leading-relaxed">
            {selectedReq?.comments || "No official comments provided yet."}
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-900 shadow-lg uppercase"
        >
          Close View
        </button>
      </div>
    </div>
  );
};

// IMPORTANT: This line must exist and match exactly!
export default ApprovalModal;