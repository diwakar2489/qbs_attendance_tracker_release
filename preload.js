const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  //onStatusChange: (callback) => ipcRenderer.on("network-status", (_event, status) => callback(status)),
  
  login: (email, password) => ipcRenderer.invoke('login', { email, password }),
  
  getIdleTime:() => ipcRenderer.invoke('get-idle-time'),
  getIdleState:(threshold) => ipcRenderer.invoke('get-idle-state',threshold),
  
  getSystemMoniter:() => ipcRenderer.invoke('get-idle-monitoring'),
  startTokenMonitoring:() => ipcRenderer.invoke("start-token-monitoring"),
  redirectDashboard:() => ipcRenderer.send("load-dashboard"),
  redirectLogin:() => ipcRenderer.send("redirect-login"),
  loadLogin:() => ipcRenderer.send("load-login"),
  getTokens: () => ipcRenderer.invoke("get-tokens"),
  getProfile: () => ipcRenderer.invoke("getProfile"),
  getUserLoginTime: () => ipcRenderer.invoke("getUserLoginTime"),
  todatAttendanceList: () => ipcRenderer.invoke("todatAttendanceList"),
  logout: () => ipcRenderer.invoke("logout"),

});
contextBridge.exposeInMainWorld("networkStatus", {
  checkStatus: () => navigator.onLine,
  onOnline: (callback) => window.addEventListener("online", callback),
  onOffline: (callback) => window.addEventListener("offline", callback),
  notifyMain: (status) => ipcRenderer.send(status ? "user-online" : "user-offline"),
});
window.addEventListener("contextmenu", (event) => {
  if (event.target.tagName === "IMG" || event.target.tagName === "P" || event.target.tagName === "SPAN") {
      event.preventDefault(); // Disable right-click on images and text
  }
});

window.addEventListener("dragstart", (event) => {
  event.preventDefault(); // Disable dragging content
});

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && ["c", "x", "v", "a"].includes(event.key.toLowerCase())) {
      event.preventDefault(); // Block Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+A
  }
});

