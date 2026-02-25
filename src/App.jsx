import React, { useState } from "react";
import { useRequests } from "./hooks/useRequests";
import FilterBar from "./components/layout/FilterBar";
import RTSTable from "./components/table/RTSTable";
import DetailsModal from "./components/modals/DetailsModal";
import AddRequestModal from "./components/modals/AddRequestModal";
import ApprovalModal from "./components/modals/ApprovalModal";
import LoginPage from "./pages/LoginPage";

/**
 * Main Application Component
 * Manages Authentication state and distributes the RTS state to child components.
 */
export default function App() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Custom Hook for RTS Logic (requests, activeModal, selectedReq, etc.)
  const rts = useRequests();

  // 1. Conditional Rendering for Login
  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 font-sans text-[12px]">
      
      {/* 2. HEADER & FILTER SECTION */}
      {/* We pass the whole rts object so FilterBar can access showProfileMenu and setActiveModal */}
      <FilterBar 
        rts={rts} 
        onAddClick={() => rts.setActiveModal("add")} 
        user={{ name: "Bradpitt", role: "System Admin" }}
        onLogout={() => setIsLoggedIn(false)}
      />

      {/* 3. COUNTER & STATS */}
      <p className="text-[16px] text-green-500 mb-4 text-center font-bold uppercase tracking-wider">
        {rts.requests.length} Total Requests Found
      </p>

      {/* 4. MAIN DATA TABLE */}
      {/* We pass specific handlers to trigger the correct modals on click */}
      <RTSTable 
        requests={rts.requests} 
        onRowClick={(row) => { 
          rts.setSelectedReq(row); 
          rts.setActiveModal("details"); 
        }}
        onStatusClick={(row) => { 
          rts.setSelectedReq(row); 
          rts.setActiveModal("approval"); 
        }}
      />

      {/* 5. MODAL MANAGER SECTION */}
      {/* Only the active modal string determines which component mounts */}
      
      {/* Request Details Popup */}
      {rts.activeModal === "details" && (
        <DetailsModal 
          selectedReq={rts.selectedReq} 
          onClose={rts.closeModal} 
        />
      )}

      {/* New Request Creation Popup */}
      {rts.activeModal === "add" && (
        <AddRequestModal rts={rts} />
      )}

      {/* RM/HOD Approval Status Popup */}
      {rts.activeModal === "approval" && (
        <ApprovalModal 
          selectedReq={rts.selectedReq} 
          onClose={rts.closeModal} 
        />
      )}
      
    </div>
  );
}