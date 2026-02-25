export const StatusBadge = ({ status }) => {
  const styles = status === "Approved" 
    ? "bg-green-100 text-green-700" 
    : "bg-amber-100 text-amber-700";
    
  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${styles}`}>
      {status}
    </span>
  );
};