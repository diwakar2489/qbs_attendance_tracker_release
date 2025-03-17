const { contextBridge, ipcRenderer } = require("electron");

ipcRenderer.send('send-data', { key: 'value' });

contextBridge.exposeInMainWorld("api", {
  getIdleTime: async () => ipcRenderer.invoke('get-idle-time'),
  getIdleState: async (threshold) => ipcRenderer.invoke('get-idle-state', threshold),

  login: (credentials) => ipcRenderer.send("api:login", credentials),
  onLoginResponse: (callback) => ipcRenderer.on("api:loginResponse", (_, response) => callback(response)),

  getProfile: () => ipcRenderer.send("api:getProfile"),
  onProfileResponse: (callback) => ipcRenderer.on("api:getProfileResponse", (_, response) => callback(response)),

  getUserLoginTime: () => ipcRenderer.send("api:getUserLoginTime"),
  onUserLoginResponse: (callback) => ipcRenderer.on("api:onUserLoginResponse", (_, response) => callback(response)),

  todatAttendanceList: () => ipcRenderer.send("api:todatAttendanceList"),
  onTodatAttendanceResponse: (callback) => ipcRenderer.on("api:onTodatAttendanceResponse", (_, response) => callback(response)),

  logout: (data) => ipcRenderer.send("api:logout",data), // Expose logout function
  onlogoutResponse: (callback) => ipcRenderer.on("api:onlogoutResponse", (_, response) => callback(response)),
});
