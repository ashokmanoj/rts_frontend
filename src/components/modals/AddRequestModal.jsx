import { useState, useEffect, useRef } from "react";
import {
  X, Upload, ChevronDown, ChevronLeft, ChevronRight,
  FileText, FileSpreadsheet, FileImage,
  Film, Music, Archive, File, Calendar, AlertTriangle,
} from "lucide-react";
import { useEscapeKey } from "../../hooks/useEscapeKey";

const DEPARTMENTS = [
  "Academic","Accounts","Admin","Animation","Broadcasting",
  "Business Development","Corporate Communications","Documentation",
  "Food Committee","Game Development","Govt. Relations","HR","Management","Marketing",
  "Operation","Purchase","RTS Help Desk","Software","Store",
  "System admin","TA Committee","Technical Support",
];

function getFileInfo(file) {
  const t = file.type;
  if (t.startsWith("image/"))  return { kind:"image",   label:"Image",       color:"bg-purple-100", iconColor:"text-purple-500" };
  if (t.startsWith("video/"))  return { kind:"video",   label:"Video",       color:"bg-pink-100",   iconColor:"text-pink-500"   };
  if (t.startsWith("audio/"))  return { kind:"audio",   label:"Audio",       color:"bg-yellow-100", iconColor:"text-yellow-500" };
  if (t === "application/pdf") return { kind:"pdf",     label:"PDF",         color:"bg-red-100",    iconColor:"text-red-500"    };
  if (t.includes("word"))      return { kind:"word",    label:"Word Doc",    color:"bg-blue-100",   iconColor:"text-blue-600"   };
  if (t.includes("excel") || t.includes("spreadsheet"))
    return { kind:"excel", label:"Spreadsheet", color:"bg-green-100",  iconColor:"text-green-600"  };
  if (t.includes("zip")||t.includes("rar")||t.includes("tar")||t.includes("7z"))
    return { kind:"archive", label:"Archive",   color:"bg-orange-100", iconColor:"text-orange-500" };
  return { kind:"other", label:"File", color:"bg-slate-100", iconColor:"text-slate-500" };
}

function FileKindIcon({ kind, iconColor, size = 28 }) {
  const cls = iconColor;
  if (kind === "image")   return <FileImage      size={size} className={cls} />;
  if (kind === "video")   return <Film           size={size} className={cls} />;
  if (kind === "audio")   return <Music          size={size} className={cls} />;
  if (kind === "pdf")     return <FileText       size={size} className={cls} />;
  if (kind === "word")    return <FileText       size={size} className={cls} />;
  if (kind === "excel")   return <FileSpreadsheet size={size} className={cls} />;
  if (kind === "archive") return <Archive        size={size} className={cls} />;
  return <File size={size} className={cls} />;
}

function formatSize(bytes) {
  if (bytes < 1024)            return `${bytes} B`;
  if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function priorityFromDueDate(dueDate) {
  if (!dueDate) return null;
  const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0)   return { label: "Overdue",  color: "bg-red-600 text-white",    days };
  if (days <= 7)  return { label: "High",     color: "bg-red-100 text-red-700",  days };
  if (days <= 15) return { label: "Medium",   color: "bg-amber-100 text-amber-700", days };
  if (days <= 30) return { label: "Low",      color: "bg-green-100 text-green-700", days };
  return null;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEK_DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function CalendarPicker({ value, onChange, minDateStr }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const todayParts = new Date();
  const initYear  = value ? parseInt(value.split("-")[0]) : todayParts.getFullYear();
  const initMonth = value ? parseInt(value.split("-")[1]) - 1 : todayParts.getMonth();
  const [viewYear,  setViewYear]  = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toLocal = (str) => { const [y,m,d] = str.split("-").map(Number); return new Date(y, m-1, d); };
  const today      = new Date(todayParts.getFullYear(), todayParts.getMonth(), todayParts.getDate());
  const minDate    = minDateStr ? toLocal(minDateStr) : today;
  const selectedD  = value ? toLocal(value) : null;

  const firstDow   = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMon  = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1);
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0),  setViewYear(y => y + 1)) : setViewMonth(m => m + 1);

  const selectDay = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    if (d < minDate) return;
    onChange(`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`);
    setOpen(false);
  };

  const displayLabel = selectedD
    ? selectedD.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })
    : "Select due date — optional";

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-3 bg-slate-100 hover:bg-slate-200/60 px-5 py-3.5 rounded-2xl font-medium text-[13px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
      >
        <Calendar size={15} className="text-indigo-400 flex-shrink-0" />
        <span className={selectedD ? "text-slate-800 font-bold flex-1 text-left" : "text-slate-400 flex-1 text-left"}>
          {displayLabel}
        </span>
        {selectedD && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="hover:text-red-500 text-slate-300 transition-colors cursor-pointer"
          >
            <X size={14} />
          </span>
        )}
        {!selectedD && <ChevronDown size={14} className="text-slate-400" />}
      </button>

      {/* Popup calendar */}
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">

          {/* Month nav header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500">
            <button type="button" onClick={prevMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="text-white font-black text-[14px] leading-none">{MONTHS[viewMonth]}</p>
              <p className="text-indigo-200 text-[11px] font-bold mt-0.5">{viewYear}</p>
            </div>
            <button type="button" onClick={nextMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Week day labels */}
          <div className="grid grid-cols-7 bg-indigo-50 px-3 pt-2 pb-1">
            {WEEK_DAYS.map(d => (
              <div key={d} className={`text-center text-[10px] font-black pb-1 ${d === "Su" || d === "Sa" ? "text-rose-400" : "text-indigo-400"}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 px-3 py-2 gap-y-1">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`g${i}`} />)}
            {Array.from({ length: daysInMon }).map((_, i) => {
              const day      = i + 1;
              const thisDate = new Date(viewYear, viewMonth, day);
              const isPast   = thisDate < minDate;
              const isToday  = thisDate.getTime() === today.getTime();
              const isSel    = selectedD && thisDate.getTime() === selectedD.getTime();
              const isWknd   = thisDate.getDay() === 0 || thisDate.getDay() === 6;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => selectDay(day)}
                  className={[
                    "h-8 w-full flex items-center justify-center rounded-xl text-[12px] font-bold transition-all select-none",
                    isPast  ? "text-slate-200 cursor-not-allowed"                                           : "cursor-pointer",
                    isSel   ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105"             : "",
                    isToday && !isSel ? "ring-2 ring-indigo-400 text-indigo-600"                          : "",
                    !isPast && !isSel && isWknd  ? "text-rose-400 hover:bg-rose-50"                       : "",
                    !isPast && !isSel && !isWknd ? "text-slate-700 hover:bg-indigo-50"                    : "",
                  ].join(" ")}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => {
                const t = today;
                onChange(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`);
                setOpen(false);
              }}
              className="w-full text-center text-[11px] font-black text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 py-2 rounded-xl transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddRequestModal({ onClose, onSubmit, currentUser }) {
  const [purpose,      setPurpose]      = useState("");
  const [description,  setDescription]  = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [dueDate,      setDueDate]      = useState("");

  const fileInputRef = useRef(null);

  useEscapeKey(onClose);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    if (!newFiles.length) return;
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newFiles.map(f => f.type.startsWith("image/") ? URL.createObjectURL(f) : null)]);
    e.target.value = "";
  };

  const handleRemoveFile = (idx) => {
    const preview = imagePreviews[idx];
    if (preview) URL.revokeObjectURL(preview);
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveAll = () => {
    imagePreviews.forEach(p => p && URL.revokeObjectURL(p));
    setUploadedFiles([]);
    setImagePreviews([]);
  };

  const handleSubmit = () => {
    if (!purpose.trim()) return;
    onSubmit({
      purpose,
      assignedDept:  selectedDept || "",
      assignedDepts: selectedDept || "",
      description,
      files: uploadedFiles.length > 0 ? uploadedFiles : null,
      dueDate: dueDate || null,
      assignedPersonEmpId: null,
      assignedPersonName:  null,
    });
    onClose();
  };

  const urgencyInfo  = priorityFromDueDate(dueDate);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 max-h-[95dvh] flex flex-col">

        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-slate-50/50 flex-shrink-0">
          <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">Add Request</h2>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">

          {/* Title */}
          <input
            className="w-full bg-slate-100 p-4 rounded-2xl text-center border-none focus:ring-2 focus:ring-indigo-500 font-semibold outline-none text-[16px]"
            placeholder="Enter title / purpose of your request"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />

          {/* Your Department */}
          {currentUser?.dept && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Your Department</span>
              <span className="text-[15px] font-black text-indigo-700 ml-auto">{currentUser.dept}</span>
            </div>
          )}

          {/* Single dept selector */}
          <div className="relative">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full appearance-none bg-slate-100 px-5 py-4 rounded-2xl font-medium text-[13px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="">Select Department to Assign</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={11} /> Required By (Due Date) — optional
            </label>
            <CalendarPicker value={dueDate} onChange={setDueDate} minDateStr={today} />
            {urgencyInfo && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black ${urgencyInfo.color}`}>
                <AlertTriangle size={13} />
                <span>Urgency Level: {urgencyInfo.label}</span>
                <span className="ml-auto font-medium">
                  {urgencyInfo.days < 0
                    ? "Overdue!"
                    : urgencyInfo.days === 0
                    ? "Due today"
                    : `${urgencyInfo.days} day${urgencyInfo.days !== 1 ? "s" : ""} remaining`}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <textarea
            className="w-full bg-slate-100 p-4 rounded-2xl text-left border-none h-28 focus:ring-2 focus:ring-indigo-500 resize-none font-medium outline-none text-[14px]"
            placeholder="Describe your request in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Upload zone */}
          <div className="relative border-4 border-dashed border-slate-100 min-h-[150px] flex flex-col items-center justify-center rounded-3xl bg-slate-50 hover:bg-blue-50/40 transition-colors group overflow-hidden p-4">
            {uploadedFiles.length === 0 ? (
              <>
                <Upload className="text-slate-300 mb-2 group-hover:text-blue-400 transition-colors" size={30} />
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Upload images or files (optional)</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 bg-indigo-900 text-white px-5 py-1.5 rounded-xl text-xs font-black shadow-lg active:scale-95 transition-transform"
                >
                  Select files
                </button>
              </>
            ) : (
              <div className="w-full space-y-3">
                <div className="flex flex-wrap gap-3 justify-center">
                  {uploadedFiles.map((f, idx) => {
                    const info = getFileInfo(f);
                    const preview = imagePreviews[idx];
                    return (
                      <div key={idx} className="relative group/item flex-shrink-0 flex flex-col items-center">
                        <div className={`w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center ${info.color} border-2 border-white shadow-sm`}>
                          {info.kind === "image" && preview
                            ? <img src={preview} alt={f.name} className="w-full h-full object-cover" />
                            : <FileKindIcon kind={info.kind} iconColor={info.iconColor} size={28} />
                          }
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-10"
                        >
                          <X size={10} />
                        </button>
                        <p className="text-[8px] text-slate-500 font-medium mt-1 truncate w-20 text-center" title={f.name}>{f.name}</p>
                        <p className="text-[8px] text-slate-400">{formatSize(f.size)}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[11px] text-indigo-600 font-bold hover:underline">+ Add more</button>
                  <span className="text-slate-300 text-xs">|</span>
                  <button type="button" onClick={handleRemoveAll} className="text-[11px] text-red-500 font-bold hover:underline">Remove all</button>
                </div>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="*" multiple onChange={handleFileChange} />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <button onClick={onClose} className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black text-base hover:bg-red-600 shadow-lg active:scale-95 transition-all">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!purpose.trim()}
              className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black text-base hover:bg-emerald-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
