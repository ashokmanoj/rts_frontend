import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { initialRequests } from '../utils/mockData';

const Dashboard = () => {
  const [requests] = useState(initialRequests);

  return (
    <div className="p-4 bg-gray-50 min-h-screen font-sans text-xs">
      {/* HEADER FILTERS */}
      <div className="grid grid-cols-8 gap-2 mb-4 items-end bg-white p-3 shadow-sm border border-gray-200">
        <div>
          <label className="block font-bold">Requestor Name</label>
          <input type="text" className="w-full border p-1" />
        </div>
        <div>
          <label className="block font-bold">Assigned Name</label>
          <input type="text" className="w-full border p-1" />
        </div>
        {/* ... Add other filter inputs similarly ... */}
        <button className="bg-gray-200 p-1 flex items-center justify-center border">
          <Search size={16} className="mr-1" /> Search
        </button>
        <button className="bg-white p-1 border flex items-center justify-center">
          <Plus size={16} className="mr-1" /> Add Request
        </button>
      </div>

      {/* THE TABLE */}
      <div className="overflow-x-auto shadow-md">
        <table className="w-full border-collapse border border-black bg-white">
          <thead>
            {/* Top Span Headers */}
            <tr className="bg-white">
              <th colSpan="9" className="border border-black p-1 text-center text-sm">Requestor Dept</th>
              <th colSpan="4" className="border border-black p-1 text-center text-sm">Assigned Dept</th>
            </tr>
            {/* Column Headers */}
            <tr className="bg-gray-100">
              <th className="border border-black p-1">Date</th>
              <th className="border border-black p-1">Emp ID</th>
              <th className="border border-black p-1">Name</th>
              <th className="border border-black p-1">Purpose</th>
              <th className="border border-black p-1">Dept</th>
              <th className="border border-black p-1">Designation</th>
              <th className="border border-black p-1">Location</th>
              <th className="border border-black p-1 text-blue-600 underline cursor-pointer">RM Status</th>
              <th className="border border-black p-1 text-blue-600 underline cursor-pointer">HOD Status</th>
              {/* Assigned Dept Columns */}
              <th className="border border-black p-1">Dept</th>
              <th className="border border-black p-1">Status</th>
              <th className="border border-black p-1">Resolve Date</th>
              <th className="border border-black p-1">Resolved by</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-blue-50 cursor-pointer">
                <td className="border border-black p-1">{req.date}</td>
                <td className="border border-black p-1">{req.empId}</td>
                <td className="border border-black p-1">{req.name}</td>
                <td className="border border-black p-1 text-blue-700 underline">{req.purpose}</td>
                <td className="border border-black p-1">{req.dept}</td>
                <td className="border border-black p-1">{req.designation}</td>
                <td className="border border-black p-1">{req.location}</td>
                <td className="border border-black p-1 text-center">{req.rmStatus}</td>
                <td className="border border-black p-1 text-center">{req.hodStatus}</td>
                <td className="border border-black p-1">{req.assignedDept}</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1">{req.resolveDate}</td>
                <td className="border border-black p-1">{req.resolvedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;