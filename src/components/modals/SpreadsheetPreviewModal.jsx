import { useState, useEffect, useRef } from "react";
import { X, Download, FileSpreadsheet, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { resolveFileUrl } from "../../utils/security";

const MAX_ROWS = 500;

export default function SpreadsheetPreviewModal({ url, fileName, onClose }) {
  const [sheetNames,  setSheetNames]  = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [headers,     setHeaders]     = useState([]);
  const [rows,        setRows]        = useState([]);
  const [truncated,   setTruncated]   = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const wbRef = useRef(null);

  const parseSheet = (wb, idx) => {
    const sheet = wb.Sheets[wb.SheetNames[idx]];
    const data  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!data.length) { setHeaders([]); setRows([]); setTruncated(false); return; }
    const [headerRow, ...dataRows] = data;
    const isTrunc = dataRows.length > MAX_ROWS;
    setHeaders(headerRow.map(String));
    setRows(isTrunc ? dataRows.slice(0, MAX_ROWS) : dataRows);
    setTruncated(isTrunc);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(resolveFileUrl(url));
        if (!res.ok) throw new Error("Network error");
        const buf = await res.arrayBuffer();
        const wb  = XLSX.read(buf, { type: "array" });
        wbRef.current = wb;
        setSheetNames(wb.SheetNames);
        parseSheet(wb, 0);
      } catch {
        setError("Failed to load the file. It may be unavailable or corrupted.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [url]);

  const switchSheet = (idx) => {
    setActiveSheet(idx);
    if (wbRef.current) parseSheet(wbRef.current, idx);
  };


  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center border border-teal-100">
            <FileSpreadsheet size={18} className="text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-800 text-[13px] truncate">{fileName}</p>
            {!loading && !error && (
              <p className="text-[10px] text-slate-400 font-medium">
                {rows.length}{truncated ? "+" : ""} rows &middot; {headers.length} columns
                {sheetNames.length > 1 && ` · ${sheetNames.length} sheets`}
              </p>
            )}
          </div>
          <a
            href={resolveFileUrl(url)}
            download={fileName}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black px-3 py-2 rounded-xl transition-all active:scale-95 shadow-sm"
          >
            <Download size={13} /> Download
          </a>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Sheet tabs ── */}
        {sheetNames.length > 1 && (
          <div className="flex gap-1 px-4 pt-2 bg-slate-50 border-b border-slate-100 flex-shrink-0 overflow-x-auto">
            {sheetNames.map((name, i) => (
              <button
                key={i}
                onClick={() => switchSheet(i)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-t-lg whitespace-nowrap transition-colors ${
                  activeSheet === i
                    ? "bg-white border border-b-white border-slate-200 text-indigo-600 -mb-px"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-52 gap-3">
              <div className="w-6 h-6 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-500 text-sm font-medium">Loading spreadsheet...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-52 gap-2 text-red-500">
              <AlertTriangle size={24} />
              <span className="text-sm font-medium text-center max-w-xs">{error}</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-slate-400 text-sm font-medium">
              This sheet is empty
            </div>
          ) : (
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-10 px-2 py-2.5 text-right text-[9px] font-black text-slate-300 border-b border-r border-slate-200 bg-slate-100 select-none">
                    #
                  </th>
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2.5 text-left font-black text-slate-700 border-b border-r border-slate-200 bg-slate-100 whitespace-nowrap"
                    >
                      {h || <span className="text-slate-300 italic font-medium">Col {i + 1}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={`hover:bg-indigo-50/40 transition-colors ${ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    <td className="px-2 py-1.5 text-right text-[9px] text-slate-300 font-medium border-r border-slate-100 select-none">
                      {ri + 1}
                    </td>
                    {headers.map((_, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-1.5 text-slate-600 border-r border-slate-100 whitespace-nowrap max-w-[240px] truncate"
                        title={row[ci] !== undefined && row[ci] !== null ? String(row[ci]) : ""}
                      >
                        {row[ci] !== undefined && row[ci] !== null ? String(row[ci]) : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Truncation warning ── */}
        {truncated && (
          <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-t border-amber-100 text-amber-700 text-[11px] font-medium">
            <AlertTriangle size={13} className="flex-shrink-0" />
            Showing first {MAX_ROWS} rows only. Download the file to view all data.
          </div>
        )}
      </div>
    </div>
  );
}
