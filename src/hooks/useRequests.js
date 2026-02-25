import { useState } from "react";
import { INITIAL_DATA } from "../constants/data";

export const useRequests = () => {
  const [requests, setRequests] = useState(INITIAL_DATA);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedReq, setSelectedReq] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  
  // Define the state for the profile menu
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const closeModal = () => {
    setActiveModal(null);
    setPreviewImage(null);
  };

  return {
    requests,
    setRequests,
    activeModal,
    setActiveModal,
    selectedReq,
    setSelectedReq,
    previewImage,
    setPreviewImage,
    closeModal,
    // YOU MUST ADD BOTH OF THESE LINES BELOW
    showProfileMenu, 
    setShowProfileMenu 
  };
};