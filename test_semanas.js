const formatDate = (date) => {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
};

const getSemanas = () => {
  const w = [];
  const currDate = new Date();
  const day = currDate.getDay() || 7; 
  currDate.setDate(currDate.getDate() - (day - 1));
  currDate.setHours(0,0,0,0);
  
  for (let i = 0; i < 12; i++) {
    const monday = new Date(currDate);
    monday.setDate(monday.getDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23,59,59,999);
    
    w.push({
      label: `${formatDate(monday)} al ${formatDate(sunday)}`,
      start: monday.getTime(),
      end: sunday.getTime()
    });
  }
  return w.reverse();
};

console.log(getSemanas());
