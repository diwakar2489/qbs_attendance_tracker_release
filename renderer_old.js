const { ipcRenderer } = require("electron");
document.getElementById("updateBtn").addEventListener("click", () => {
  ipcRenderer.send("check-for-update");
});
