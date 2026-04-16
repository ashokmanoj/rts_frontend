import { useState } from "react";
import { X, User, ChevronDown, CheckCircle, XCircle, Clock, Forward, ImageOff, ZoomIn, Download, Bell, Send, ShieldCheck } from "lucide-react";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { getNowTime, getNowDate, getNowDateTime } from "../../utils/dateTime";
import StatusBadge from "../table/StatusBadge";
import ChatPanel   from "../chat/ChatPanel";

const DEPARTMENTS = ["Academic","Accounts","Admin","Animation","Broadcasting","Business Development","Corporate Communications","Documentation","Govt. Relations","HR","Management","Marketing","Operation","Purchase","Software","Store","System admin","Technical Support"];

function ImageLightbox({ src, fileName, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center" onClick={onClose}>
      <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between w-full px-2">
          <span className="text-white text-sm font-bold truncate max-w-[80%]">{fileName || "Image"}</span>
          <div className="flex items-center gap-2">
            <a href={src} download={fileName} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"><Download size={16}/></a>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-red-500 rounded-full text-white"><X size={16}/></button>
          </div>
        </div>
        <img src={src} alt={fileName} className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"/>
      </div>
    </div>
  );
}

function ApprovalProgress({ rmStatus, hodStatus, deptHodStatus, isClosed }) {
  const steps = [
    { label: "RM",         status: rmStatus      },
    { label: "HOD",        status: hodStatus      },
    { label: "Dept HOD",   status: deptHodStatus  },
  ];
  const dotCls = (s) =>
    s === "Approved"  ? "bg-emerald-500 border-emerald-500 text-white" :
    s === "Rejected"  ? "bg-red-500 border-red-500 text-white"         :
    s === "Checking"  ? "bg-amber-400 border-amber-400 text-white"     :
    s === "Forwarded" ? "bg-blue-500 border-blue-500 text-white"       :
    "bg-slate-100 border-slate-200 text-slate-400";
  const lineCls = (s) =>
    !s || s === "--"  ? "bg-slate-200"    :
    s === "Approved"  ? "bg-emerald-400"  :
    s === "Rejected"  ? "bg-red-400"      : "bg-amber-300";
  return (
    <div className="space-y-1">
      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Approval Progress</p>
      <div className="flex items-center">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-black ${dotCls(step.status)}`}>
                {step.status==="Approved" ? <CheckCircle size={12}/> : step.status==="Rejected" ? <XCircle size={12}/> : step.status==="Checking" ? <Clock size={12}/> : step.status==="Forwarded" ? <Forward size={11}/> : <span>{i+1}</span>}
              </div>
              <span className="text-[7px] text-slate-500 font-bold mt-0.5 text-center px-0.5 truncate w-full">{step.label}</span>
              {step.status && step.status!=="--" && (
                <span className={`text-[7px] font-black ${step.status==="Approved"?"text-emerald-600":step.status==="Rejected"?"text-red-500":step.status==="Checking"?"text-amber-600":"text-blue-500"}`}>{step.status}</span>
              )}
            </div>
            {i < steps.length-1 && <div className={`h-0.5 w-3 flex-shrink-0 mx-0.5 ${lineCls(step.status)}`}/>}
          </div>
        ))}
        <div className="flex items-center flex-shrink-0">
          <div className={`h-0.5 w-3 ${isClosed?"bg-emerald-400":"bg-slate-200"}`}/>
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-black ${isClosed?"bg-emerald-500 border-emerald-500 text-white":"bg-slate-100 border-slate-200 text-slate-300"}`}>
              {isClosed ? "✓" : "🔒"}
            </div>
            <span className="text-[7px] text-slate-500 font-bold mt-0.5">Closed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DetailsModal({ req, chatLogs, currentUser, onClose, onSendMessage, onApproval, onOpenCloseTicket }) {
  const [selectedDept,    setSelectedDept]    = useState(req?.assignedDept || "");
  const [approvalComment, setApprovalComment] = useState("");
  const [lightboxSrc,     setLightboxSrc]     = useState(null);

  useEscapeKey(lightboxSrc ? () => setLightboxSrc(null) : onClose);

  const logs      = chatLogs[req?.id] || [];
  const deptChanged = selectedDept !== req?.assignedDept;
  const isClosed  = req?.isClosed || false;
  const role      = currentUser?.role || "";
  const roleLow   = role.toLowerCase();

  const isRM         = roleLow === "rm";
  const isHOD        = roleLow === "hod";
  const isDeptHOD    = roleLow === "depthod";
  const isManagement = roleLow === "management";
  const isAdmin      = roleLow === "admin";
  const isOwnRequest = req?.empId === currentUser?.empId;
  const isFromOtherDept = req?.dept !== currentUser?.dept;
  const isAssignedToMyDept = req?.assignedDept === currentUser?.dept;
  const isTeamMemberIncoming = isFromOtherDept && isAssignedToMyDept;

  // New logic: RM/HOD/DeptHOD requests approved by Management
  const isSpecialRequest = ["RM", "HOD", "DeptHOD"].includes(req?.role); 
  
  const canApprove    = (isRM || isHOD || isDeptHOD || isManagement) && !isClosed && !isOwnRequest && (!isSpecialRequest || isManagement);
  const canChangeDept = (isRM || isHOD || isDeptHOD || isManagement) && !isOwnRequest && !isClosed;
  // Users can close tickets of OTHER departments assigned to THEIR department
  const canClose      = ((isDeptHOD || isManagement) && !isOwnRequest && !isClosed) || (isTeamMemberIncoming && !isClosed && !isAdmin);
  const canChat       = !isAdmin && !isClosed;
  const isRequestorMode = roleLow === "requestor" || isOwnRequest;

  // Team members can click "Checking" on incoming requests from other departments
  const canUserCheck = isTeamMemberIncoming && !isClosed && !isAdmin && !canApprove;

  const isImageUrl = (url) => url && /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url);

  const handleApproval = (decision) => {
    const dateTime = getNowDateTime();
    onApproval(req.id, decision, dateTime, currentUser, approvalComment, selectedDept);
    onSendMessage(req.id, {
      id: Date.now(), author: currentUser.name, role: currentUser.role,
      text: approvalComment || `${decision} the request.`,
      time: getNowTime(), date: getNowDate(),
      type: "approval", status: decision, purpose: req.purpose,
      changedDept: decision === "Forwarded" ? selectedDept : null,
      originalDept: req.assignedDept,
    });
    setApprovalComment("");
  };

  const actionLabel = isManagement ? "Management Action" : isRM?"RM Action":isHOD?"HOD Action":isDeptHOD?"Dept HOD Action":"";

  const roleBadgeCls =
    isRM         ? "bg-blue-100 text-blue-700"   :
    isHOD        ? "bg-purple-100 text-purple-700":
    isDeptHOD    ? "bg-teal-100 text-teal-700"   :
    isManagement ? "bg-rose-100 text-rose-700"   :
    isAdmin      ? "bg-orange-100 text-orange-700":
    "bg-indigo-100 text-indigo-700";

  return (
    <>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} fileName={req?.fileName} onClose={() => setLightboxSrc(null)} />}
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl border border-slate-200 flex flex-col" style={{maxHeight:"95vh"}}>

          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center bg-slate-50/50 flex-shrink-0 rounded-t-[2rem]">
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isRequestorMode?"bg-indigo-100 text-indigo-600":isManagement?"bg-rose-100 text-rose-600":"bg-blue-100 text-blue-600"}`}>
                {isRequestorMode ? <Bell size={15}/> : isManagement ? <ShieldCheck size={14}/> : <Send size={14}/>}
              </div>
              <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800">#{req?.id} — {req?.purpose}</h2>
              {req?.forwarded && <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black"><Forward size={10}/> Forwarded</span>}
              {isClosed && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black">🔒 Closed</span>}
              {isOwnRequest && !isRequestorMode && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black">Your Request</span>}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${roleBadgeCls}`}>{currentUser?.dept}department</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors flex-shrink-0"><X size={20}/></button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* LEFT PANEL */}
            <div className="w-[48%] border-r border-slate-200 overflow-y-auto p-5 space-y-3 pb-8">

              <ApprovalProgress rmStatus={req?.rmStatus} hodStatus={req?.hodStatus} deptHodStatus={req?.deptHodStatus} mgmtStatus={req?.mgmtStatus} isClosed={isClosed}/>

              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1 pt-1"><User size={11}/> User Information</p>

              <div className="grid grid-cols-2 gap-2">
                {[{label:"Date",value:req?.date},{label:"User ID",value:req?.empId},{label:"Name",value:req?.name},{label:"Department",value:req?.dept},{label:"Designation",value:req?.designation},{label:"Location",value:req?.location}].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{item.label}</p>
                    <p className="font-bold text-slate-800 text-[12px]">{item.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">Request Title</p>
                <div className="w-full bg-slate-200 p-3 rounded-xl text-center font-bold text-slate-500 text-[12px] border border-slate-300 cursor-not-allowed select-none">
                  <span className="text-slate-400 text-[11px]">🔒 </span>{req?.purpose}
                </div>
              </div>

              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">
                  Assigned Department
                  {deptChanged && canChangeDept && <span className="ml-1 text-blue-600 normal-case font-bold text-[9px]">(<span className="line-through text-slate-400">{req?.assignedDept}</span> → <b>{selectedDept}</b>)</span>}
                </p>
                <div className="relative">
                  <select value={selectedDept} onChange={(e) => canChangeDept && setSelectedDept(e.target.value)} disabled={!canChangeDept}
                    className={`w-full appearance-none p-3 rounded-xl text-center font-bold border-none focus:ring-2 transition-all text-sm ${deptChanged&&canChangeDept?"bg-blue-50 text-blue-700 ring-2 ring-blue-300 cursor-pointer":canChangeDept?"bg-slate-100 text-slate-700 focus:ring-indigo-500 cursor-pointer":"bg-slate-100 text-slate-500 cursor-not-allowed"}`}>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d} Department</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15}/>
                </div>
              </div>

              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">Request Description</p>
                <div className="w-full bg-slate-50 p-3 rounded-xl text-slate-600 border border-slate-200 leading-relaxed text-[12px]">{req?.description || "No description provided."}</div>
              </div>

              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">Attached File</p>
                <div className="border-2 border-dashed border-blue-100 p-3 flex justify-center items-center rounded-xl bg-blue-50/30 min-h-[90px]">
                  {req?.fileUrl ? (
                    isImageUrl(req.fileUrl) ? (
                      <div className="relative group cursor-pointer" onClick={() => setLightboxSrc(req.fileUrl)}>
                        <img src={req.fileUrl} alt={req.fileName||"attachment"} className="rounded-lg shadow-md border-4 border-white max-h-48 object-contain group-hover:brightness-90 transition-all"/>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><div className="bg-black/50 rounded-full p-2"><ZoomIn size={20} className="text-white"/></div></div>
                        <p className="text-[10px] text-slate-400 text-center mt-1 font-medium">Click to view full size</p>
                      </div>
                    ) : (
                      <a href={req.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold text-[12px] underline">📎 {req.fileName||"View attachment"}</a>
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-300"><ImageOff size={28}/><span className="text-[10px] font-bold text-slate-400">No attachment</span></div>
                  )}
                </div>
              </div>

              {/* Approval action — hidden when isClosed */}
              {(canApprove || canUserCheck) && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{canApprove ? actionLabel : "Team Action"}</p>
                  
                  {canApprove ? (
                    <>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[{label:"RM",status:req?.rmStatus,date:req?.rmDate},{label:"HOD",status:req?.hodStatus,date:req?.hodDate},{label:"DeptHOD",status:req?.deptHodStatus,date:req?.deptHodDate}].map((s) => (
                          <div key={s.label} className="bg-slate-50 rounded-xl p-2 border border-slate-100 text-center">
                            <p className="text-[8px] text-slate-600 font-bold uppercase mb-1">{s.label}</p>
                            <StatusBadge status={s.status} date={s.date}/>
                          </div>
                        ))}
                      </div>
                      <textarea value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)}
                        className="w-full border-2 border-slate-100 p-3 rounded-xl h-16 outline-none focus:border-indigo-400 bg-slate-50 transition-all font-medium text-[12px] resize-none"
                        placeholder="Add your official comments here..."/>
                      <div className="grid grid-cols-3 gap-2">
                        {deptChanged ? (
                          <button onClick={() => handleApproval("Forwarded")} className="bg-blue-500 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-blue-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5"><Forward size={13}/> Forward</button>
                        ) : (
                          <button onClick={() => handleApproval("Approved")} className="bg-emerald-500 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-emerald-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5"><CheckCircle size={13}/> Approve</button>
                        )}
                        <button onClick={() => handleApproval("Checking")} className="bg-amber-500 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-amber-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5"><Clock size={13}/> Checking</button>
                        <button onClick={() => handleApproval("Rejected")} className="bg-red-500 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-red-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5"><XCircle size={13}/> Reject</button>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                       <button onClick={() => handleApproval("Checking")} className="bg-amber-500 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-amber-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5"><Clock size={13}/> Checking</button>
                       <button onClick={() => onOpenCloseTicket(req)} className="bg-red-500 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-red-600 shadow-md uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5">🔒 Close Ticket</button>
                    </div>
                  )}
                </div>
              )}

              {/* Closure data display */}
              {isClosed && req.closeData && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-4 space-y-2">
                   <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={12}/> Closure Details</p>
                   <div className="space-y-1">
                      <p className="text-[11px] text-slate-700 font-bold leading-relaxed">{req.closeData.description}</p>
                      <p className="text-[9px] text-slate-400 font-medium">Closed on {req.closeData.closedDate}</p>
                   </div>
                   {req.closeData.fileUrl && (
                      <div className="pt-2">
                         {isImageUrl(req.closeData.fileUrl) ? (
                            <img src={req.closeData.fileUrl} onClick={() => setLightboxSrc(req.closeData.fileUrl)} className="h-20 w-auto rounded-lg border-2 border-white shadow-sm cursor-pointer hover:brightness-95 transition-all"/>
                         ) : (
                            <a href={req.closeData.fileUrl} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold text-[10px] flex items-center gap-1 underline">📎 View Closure Attachment</a>
                         )}
                      </div>
                   )}
                </div>
              )}

              {/* Closed notice — all roles */}
              {isClosed && !req.closeData && (
                <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-slate-500 font-black text-[11px] uppercase tracking-wider">🔒 Ticket Closed — All actions disabled</p>
                </div>
              )}

              {/* Own request notice */}
              {isOwnRequest && (isRM||isHOD||isDeptHOD||isManagement) && !isClosed && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-amber-700 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1"><Bell size={13} className="text-amber-500"/> Your Own Request</p>
                  <p className="text-amber-600 text-[10px] mt-0.5">You cannot approve your own submission.</p>
                </div>
              )}

              {/* Admin read-only notice */}
              {isAdmin && (
                <div className="border border-orange-200 bg-orange-50 rounded-xl p-3 text-center">
                  <p className="text-orange-600 font-black text-[11px] uppercase tracking-wider">👁 Admin — Read Only Access</p>
                  <p className="text-orange-500 text-[10px] mt-0.5">You can view all details but cannot take any actions.</p>
                </div>
              )}

              {/* Close Ticket button — only show at bottom if NOT already in the action section above */}
              {canClose && !canUserCheck && (
                <div className="mt-2">
                  <button onClick={() => onOpenCloseTicket(req)} className="w-full py-3 rounded-2xl font-black text-[12px] transition-all shadow-md bg-red-500 text-white hover:bg-red-600 active:scale-95">
                    🔒 Close Ticket
                  </button>
                </div>
              )}

              {/* Close Ticket disabled */}
              {(isDeptHOD||isManagement) && !isOwnRequest && isClosed && (
                <div className="mt-2">
                  <button disabled className="w-full py-3 rounded-2xl font-black text-[12px] bg-slate-200 text-slate-400 cursor-not-allowed">🔒 Ticket Closed</button>
                </div>
              )}
            </div>

            {/* RIGHT PANEL — Chat */}
            <ChatPanel reqId={req?.id} logs={logs} currentUser={currentUser} onSendMessage={onSendMessage} isClosed={isClosed} canChat={canChat}/>
          </div>
        </div>
      </div>
    </>
  );
}
