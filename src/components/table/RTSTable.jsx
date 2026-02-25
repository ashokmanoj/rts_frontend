import React from "react";

const RTSTable = ({ requests, onRowClick, onStatusClick }) => {
  return (
    <div className="bg-white rounded-xl shadow-xl border border-black max-h-[85vh] overflow-auto">
      <table className="w-full border-collapse">
        <thead className="z-20">
          <tr className="bg-white text-slate-800 uppercase font-black text-[13px]">
            <th colSpan="10" className="sticky top-0 bg-gray-300 border-b border-r border-black p-3 text-center z-20">
              Requestor Department
            </th>
            <th className="sticky top-0 bg-[#f1f5f9] border-b w-8 z-20"></th>
            <th colSpan="4" className="sticky top-0 bg-gray-300 border-b border-l border-black p-3 text-center z-20">
              Assigned Department
            </th>
          </tr>
          <tr className="bg-slate-100 text-slate-700 font-bold">
            {["Sl.No.", "Date", "Emp ID", "Name", "Purpose", "Department", "Designation", "Location", "RM Status", "HOD Status"].map((h, i) => (
              <th key={i} className="sticky top-[45px] bg-slate-100 border-b border-r border-black p-2 z-10 text-center">{h}</th>
            ))}
            <th className="sticky top-[45px] bg-[#f1f5f9] border-b border-black w-8 z-10"></th>
            {["Department", "Status", "Resolve Date", "Resolved by"].map((h, i) => (
              <th key={i} className={`sticky top-[45px] bg-slate-100 border-b border-r border-black p-1 z-10 text-center ${i === 0 ? "border-l" : ""} last:border-r-0`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {requests.map((row) => (
            <tr key={row.id} className="hover:bg-blue-50/50 transition-colors border-b border-black">
              <td className="border-r border-black p-2 text-center">{row.id}</td>
              <td className="border-r border-black p-2 text-center">{row.date}</td>
              <td className="border-r border-black p-2 text-center">{row.empId}</td>
              <td className="border-r border-black p-2 text-center">{row.name}</td>
              <td className="border-r border-black p-2 text-blue-600 font-bold underline cursor-pointer text-center" onClick={() => onRowClick(row)}>{row.purpose}</td>
              <td className="border-r border-black p-2 text-center">{row.dept}</td>
              <td className="border-r border-black p-2 text-center">{row.designation}</td>
              <td className="border-r border-black p-2 text-center">{row.location}</td>
              <td className="border-r border-black p-2 text-center cursor-pointer" onClick={() => onStatusClick(row)}>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${row.rmStatus === "Approved" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{row.rmStatus}</span>
              </td>
              <td className="border-r border-black p-2 text-center cursor-pointer" onClick={() => onStatusClick(row)}>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${row.hodStatus === "Approved" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{row.hodStatus}</span>
              </td>
              <td className="bg-[#f1f5f9] border-b w-8"></td>
              <td className="border-r border-l border-black p-2 text-center">{row.assignedDept}</td>
              <td className="border-r border-black p-2 text-center">Open</td>
              <td className="border-r border-black p-2 text-center">{row.resolveDate}</td>
              <td className="p-2 text-center border-black">{row.resolvedBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RTSTable;