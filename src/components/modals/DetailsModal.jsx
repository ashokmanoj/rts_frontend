import React from "react";
import { X, ChevronDown, Send } from "lucide-react";

const DetailsModal = ({ selectedReq, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Request Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-4">
          <div className="w-full bg-slate-100 p-4 rounded-2xl text-center font-bold text-lg text-slate-700">
            {selectedReq?.purpose}
          </div>

          <div className="relative">
            <select 
              className="w-full appearance-none bg-slate-100 p-4 rounded-2xl text-center text-slate-600 font-bold border-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              defaultValue={selectedReq?.dept}
            >
              <option value="IT">IT Department</option>
              <option value="HR">HR Department</option>
              <option value="Admin">Admin Department</option>
              <option value="Finance">Finance Department</option>
              <option value="Operations">Operations Department</option>
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          </div>

          <div className="w-full bg-slate-100 p-6 rounded-2xl text-slate-500 border border-slate-200 leading-relaxed">
            I want a {selectedReq?.purpose}, my current one is not working properly. Please replace it at the earliest.
          </div>

          <div className="border-2 border-dashed border-blue-100 p-6 flex justify-center rounded-2xl bg-blue-50/30">
            <img src="https://via.placeholder.com/120" alt="product" className="rounded-xl shadow-md border-4 border-white" />
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="max-h-32 overflow-y-auto space-y-3 mb-4 pr-2 text-[15px]">
              <p><b className="text-slate-800">Bradpitt:</b> Mouse beku <span className="text-slate-400 font-normal ml-2 text-xs">13:30</span></p>
              <p><b className="text-slate-800">John Cena:</b> Please do the needful <span className="text-slate-400 font-normal ml-2 text-xs">13:45</span></p>
            </div>
            <div className="relative">
              <input className="w-full border-4 border-slate-300 p-4 pr-16 rounded-2xl outline-none focus:border-indigo-500 transition-all" placeholder="Type your message..." />
              <button className="absolute right-2 top-2 bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 shadow-md transition-all">
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;