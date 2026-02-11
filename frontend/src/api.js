const getAPIBase = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:5001/api`;
  }
  return "http://localhost:5001/api";
};

export const API = getAPIBase();
export default API;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && {Authorization: `Bearer ${token}`})
  };
};

export const getTasks = (user_id) =>
  fetch(`${API}/tasks`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({user_id})
  });

export const addTask = (task) =>
  fetch(`${API}/add_task`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(task),
  });
