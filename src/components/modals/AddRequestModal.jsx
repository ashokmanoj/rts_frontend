import React from "react";
import { X, ChevronDown, Upload } from "lucide-react";

const AddRequestModal = ({ rts }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 p-8 space-y-4">
        <input
          className="w-full bg-slate-100 p-5 rounded-2xl text-center border-none focus:ring-2 focus:ring-indigo-500 font-medium"
          placeholder="Enter title for your request purpose"
        />

        <div className="relative">
          <select className="w-full appearance-none bg-slate-100 p-5 rounded-2xl text-center border-none font-medium cursor-pointer">
            <option>Select Requestee Department</option>
            <option>IT Department</option>
            <option>HR Department</option>
          </select>
          <ChevronDown className="absolute right-5 top-6 text-slate-400" size={18} />
        </div>

        <textarea
          className="w-full bg-slate-100 p-6 rounded-2xl text-center border-none h-32 focus:ring-2 focus:ring-indigo-500 resize-none font-medium"
          placeholder="Input your request in detail here"
        />

        <div className="relative border-4 border-dashed border-slate-100 min-h-[180px] flex flex-col items-center justify-center rounded-3xl bg-slate-50 hover:bg-blue-50 transition-colors group overflow-hidden">
          {rts.previewImage ? (
            <div className="relative w-full h-full p-2 flex flex-col items-center">
              <img src={rts.previewImage} alt="Preview" className="max-h-32 rounded-lg shadow-md object-contain" />
              <button onClick={() => rts.setPreviewImage(null)} className="mt-2 text-xs text-red-500 font-bold hover:underline">Remove Image</button>
            </div>
          ) : (
            <>
              <Upload className="text-slate-300 mb-2 group-hover:text-blue-500" size={32} />
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Upload Image here</span>
              <input 
                type="file" accept="image/*" id="fileInput" className="hidden" 
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) rts.setPreviewImage(URL.createObjectURL(file));
                }} 
              />
              <button onClick={() => document.getElementById("fileInput").click()} className="mt-4 bg-indigo-900 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg">Select file</button>
            </>
          )}
        </div>

        <div className="flex space-x-4 mt-8">
          <button onClick={rts.closeModal} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-red-600 shadow-lg">Close</button>
          <button className="flex-1 bg-[#10b981] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#059669] shadow-lg">Submit</button>
        </div>
      </div>
    </div>
  );
};

export default AddRequestModal;