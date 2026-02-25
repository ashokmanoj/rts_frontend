import React from "react";
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  LogOut 
} from "lucide-react";

const FilterBar = ({ onAddClick, user, onLogout, rts }) => {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex-1 flex gap-3 overflow-x-auto">
        {/* Dropdown Filters */}
        {[
          "Requestor Name",
          "Assigned Name",
          "Requested Department",
          "Assigned Department",
          "-- All Status --",
        ].map((filter, i) => (
          <div key={i} className="relative min-w-[140px]">
            <select className="w-full appearance-none bg-white border border-slate-200 py-2 px-4 pr-8 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-[11px]">
              <option>{filter}</option>
            </select>
            <ChevronDown
              className="absolute right-2 top-2.5 text-slate-400"
              size={14}
            />
          </div>
        ))}

        {/* Date Filter */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 gap-4 min-w-[240px]">
          <input
            type="date"
            className="w-full text-sm text-slate-500 focus:outline-none cursor-pointer"
          />
        </div>

        {/* Search Button */}
        <button className="bg-[#3b82f6] hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-bold transition-all shadow-md">
          Search
        </button>
      </div>

      {/* Action Section: Add & Profile */}
      <div className="flex items-center gap-4 relative">
        <button
          onClick={onAddClick}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-sm transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus size={16} className="mr-1" /> Add Request
        </button>

        {/* Profile Section */}
        <div className="flex items-center gap-3 ml-2 border-l pl-4 border-slate-200">
          <div className="text-right hidden sm:block leading-none">
            <p className="text-[12px] font-black text-slate-800">{user.name}</p>
            <p className="text-[10px] text-slate-500 font-medium">{user.role}</p>
          </div>

          <div className="relative">
            <button
              onClick={() => rts.setShowProfileMenu(!rts.showProfileMenu)}
              className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-indigo-200 transition-colors"
            >
              <span className="font-bold text-sm">
                {user.name.substring(0, 2).toUpperCase()}
              </span>
            </button>

            {/* Logout Dropdown */}
            {rts.showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => rts.setShowProfileMenu(false)}
                ></div>
                <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-in fade-in zoom-in duration-200">
  <button
    onClick={() => {
      onLogout(); // This calls setIsLoggedIn(false) from App.jsx
      rts.setShowProfileMenu(false); // Closes the menu
    }}
    className="w-full flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors font-bold text-[12px]"
  >
    <LogOut size={16} />
    Logout
  </button>
</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;