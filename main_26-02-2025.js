// Load environment variables from .env file
const { app, BrowserWindow, dialog,ipcMain,powerMonitor } = require('electron');
const { autoUpdater } = require('electron-updater');
const axios = require('axios');
const path = require('path');
const log = require("electron-log");
const AutoLaunch = require('auto-launch');
const keytar = require('keytar');
const Store = require('electron-store');
require("dotenv").config({ path: path.join(__dirname, ".env") });

const store = new Store();

let userInfo = {};
let user_id = null;

let app_last_activity = {};
log.transports.file.resolvePath = () => `${__dirname}/logs/main.log`;
const apiBaseUrl = process.env.API_BASE_URL;
console.log("API Base URL:", apiBaseUrl);


// Retrieve GitHub Token from environment variables
const ghToken = process.env.GH_TOKEN;
//console.log("GitHub Token:", ghToken); // For testing the token
let mainWindow;
// Create the main application window
const decodeJWT = async (token) => {
    try {
      const base64Url = token.split('.')[1]; // Extract the payload
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload =  await decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }
const  startIdleMonitoring = async () => {
    const idleTime = powerMonitor.getSystemIdleTime();
    const idleState = powerMonitor.getSystemIdleState(1200); // 'active', 'idle', or 'locked'
    const authToken = await keytar.getPassword('my-electron-app', 'authToken');
    //console.log('check_token:====',authToken)
    if (idleState === 'active') {
      log.warn({ message: "System is active", status: "active" });
      log.info("System is active idleTime", idleTime);
      await sendDataToServer(idleState);
  
    } else if (idleState === 'idle') {
      log.warn({ message: "System is Idle", status: "Idle" });
      log.info("System is idle idleTime", idleTime);
      await sendDataToServer(idleState);
    }
}
let tokenCheckInterval;
const startTokenMonitoring = async () => {
    tokenCheckInterval = setInterval(async () => {
      try {
        const authToken = await keytar.getPassword('my-electron-app', 'authToken');
        if (!authToken) {
          console.warn("Auth token missing. Redirecting to login page...");
          redirectToLogin();
          clearInterval(tokenCheckInterval); // Stop the interval when there's no token
          return;
        }
  
        const decoded = await decodeJWT(authToken);
        const currentTime = Math.floor(Date.now() / 1000);
  
        if (decoded.exp < currentTime) {
          console.log("Token has expired");
          redirectToLogin();
          clearInterval(tokenCheckInterval); // Stop the interval if the token has expired
        } else {
          console.log("Token is still valid");
          startIdleMonitoring(); // Optional: Add any needed idle behavior
        }
      } catch (error) {
        console.error("Error during auth token check:", error.message);
      }
    }, 10000); // Check every 10 seconds
  }
const stopTokenMonitoring = async () => {
    if (tokenCheckInterval) {
     await clearInterval(tokenCheckInterval);
      console.log("Token monitoring stopped.");
    }
  }
const redirectToLogin = async () => {
    const windows = await BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.loadFile(path.join(__dirname, "renderer", "index.html"));
    });
    stopTokenMonitoring()
  
    // Optional: Clear other sensitive data if necessary
  }
const sendDataToServer = async (idleState) => {
    try {
       console.log(app_last_activity.last_activity,'app_last_activity.last_activity=====::')
      const idleTime = powerMonitor.getSystemIdleTime();
      if ((idleState === "idle" && app_last_activity.last_activity === 2) || (idleState === "active" && app_last_activity.last_activity === 1)) {
        const authToken = await keytar.getPassword('my-electron-app', 'authToken');
  
        const response = await fetch(`${apiBaseUrl}/system/activity-check`, {
          method: 'POST', // HTTP method
          headers: {
            'Content-Type': 'application/json', // Specify the content type
            'authorization': `bearer ${authToken}`,
          },
          body: JSON.stringify({
            idle_time: idleTime,
            idle_status: idleState,
            user_id: userInfo.id,
            user_name: userInfo.name,
            shift: userInfo.shift,
            user_time_zone:userInfo.user_time_zone,
          }),
        });
  
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  
        const result = await response.json();
        console.log('User activity Success======================::', result);
        if (result) {
          app_last_activity = { last_activity: result.last_activity };
        }
      }
    } catch (error) {
      console.log("Somthing went wrrong:", error.message);
    }
  
  }
const checkTodayAtt = async () => {
    try {
        // Retrieve auth token securely
        const authToken = await keytar.getPassword('my-electron-app', 'authToken');
        if (!authToken) {
        console.error("Authentication token is missing.");
        return;
        }

        // Ensure user info is available
        if (!userInfo || !userInfo.id || !userInfo.name || !userInfo.shift || !userInfo.user_time_zone) {
        console.error("User information is incomplete or missing.");
        return;
        }

        // Prepare request body
        const requestBody = {
        user_id: userInfo.id,
        user_name: userInfo.name,
        shift: userInfo.shift,
        user_time_zone: userInfo.user_time_zone,
        };

        // Perform API request
        const response = await fetch(`${apiBaseUrl}/system/today-att`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'authorization': `bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
        });

        // Handle HTTP errors
        if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
        }

        // Parse JSON response
        const data = await response.json();
        if (data) {
        app_last_activity = { last_activity: 1 }
        console.log('App last_activity 2========:', app_last_activity.last_activity);
        } else {
        app_last_activity = { last_activity: 2 }
        console.log('App last_activity 1========:', app_last_activity.last_activity);
        }

    } catch (error) {
        console.error("Error in checkTodayAtt:", error.message);
    }
};
  
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, "/assets/img/favicon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });
    
    // Set up autoUpdater with GitHub repository and token
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'diwakar2489',
        repo: 'qbs_attendance_tracker_release',
        token: ghToken // Use the token here
    });

    mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    
}
const appLauncher = new AutoLaunch({
    name: 'QBSLearning',
    path: app.getPath('exe'),
  });
  
 const setupAutoLaunch  = async () => {
    const isEnabled = await appLauncher.isEnabled();
  
    if (!isEnabled) {
      try {
        await appLauncher.enable();
      } catch (error) {
        console.error('Failed to enable auto-launch:', error);
      }
    }
  }
// Handle update events
autoUpdater.on('update-available', (info) => {
    console.log(`Update available: ${info.version}`);
    
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available. Do you want to download it now?`,
        buttons: ['Download', 'Cancel'],
        defaultId: 0, // Default focus on "Download"
        cancelId: 1 // Cancel button index
    }).then(result => {
        if (result.response === 0) { // "Download" button clicked
            console.log('User chose to download the update.');
            autoUpdater.downloadUpdate(); // Start downloading the update
        } else {
            console.log('User canceled the update.');
        }
    });
});

autoUpdater.on('update-not-available', () => {
    console.log('No updates available.');
});

autoUpdater.on('error', (err) => {
    console.error(`Update error: ${err.message}`);
});

autoUpdater.on('download-progress', (progress) => {
    let percent = Math.floor(progress.percent);
    console.log(`Download progress: ${percent}%`);

    // Update the app's progress bar in the taskbar (Windows/macOS)
    if (mainWindow) {
        mainWindow.setProgressBar(progress.percent / 100);
    }

    // Show a progress dialog (Optional)
    dialog.showMessageBox({
        type: 'info',
        title: 'Downloading Update',
        message: `Downloading update... ${percent}% completed.`,
        buttons: ['OK']
    });
});

autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
        mainWindow.setProgressBar(-1); // Reset progress bar
    }
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'The update has been downloaded. Restart the app to install it.',
        buttons: ['Restart Now', 'Later']
    }).then(result => {
        if (result.response === 0) { // User clicked "Restart Now"
            autoUpdater.quitAndInstall();
        }
    });
});
// Ensure updates are checked when the app is ready
app.whenReady().then(()=>{
    createMainWindow();
    setupAutoLaunch();

    app.on("activate",function (){
        if(BrowserWindow.getAllWindows().length == 0) createMainWindow();
        
    });
    const getIdleTime = () => {
        return powerMonitor.getSystemIdleTime(); // Returns idle time in seconds
      };
    
      // Handle IPC event to provide idle time
      ipcMain.handle("get-idle-time", async () => {
        return getIdleTime();
      });
    
      // Handle IPC event to provide idle state
      ipcMain.handle("get-idle-state", async (event, threshold) => {
        return powerMonitor.getSystemIdleState(threshold); // Returns 'active', 'idle', or 'locked'
      });
    // Start checking for updates after the window loads
   // mainWindow.webContents.once('did-finish-load', () => {
        if (!app.isPackaged || process.env.NODE_ENV == 'development') {
            console.log('App is not packaged. Skipping update check.');
            return;
        }
    
        autoUpdater.autoDownload = false; // Prevent automatic downloads
        autoUpdater.autoInstallOnAppQuit = true; // Install updates when app quits
    
        autoUpdater.checkForUpdates().then(updateCheck => {
            if (!updateCheck || !updateCheck.updateInfo) { // Check if updateCheck is null
                console.log('No updates available.');
                return;
            }
    
            console.log(`Update available: ${updateCheck.updateInfo.version}`);
        }).catch(err => {
            console.error("Error checking for updates:", err);
        });
   // });
   
});
powerMonitor.on('lock-screen', async () => {
    console.log('The system is locked');
    try {
      const idleTime = powerMonitor.getSystemIdleTime();
      console.log(`Idle Time: ${idleTime}`);
  
      const authToken = await keytar.getPassword('my-electron-app', 'authToken');
      if (!authToken) {
        throw new Error('Authentication token not found');
      }
      console.log('Auth token retrieved successfully');
  
      const payload = {
        idle_time: idleTime,
        idle_status: 'locked',
        user_id: userInfo.id,
        user_name: userInfo.name,
        shift: userInfo.shift,
        user_time_zone: userInfo.user_time_zone,
      };
      console.log('Request payload:', JSON.stringify(payload));
  
      const response = await fetch(`${apiBaseUrl}/system/activity-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        console.log(`HTTP Status: ${response.status}`);
        const errorDetails = await response.text();
        console.log('Response body:', errorDetails);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log(data);
  
      app_last_activity = { last_activity: 1 };
      log.warn({ message: "The system is locked successfully", status: "locked" });
      console.log('The system is locked successfully');
    } catch (error) {
      console.error('An error occurred:', error.message);
      log.warn({ message: "The system lock failed", status: "locked" });
    }
  });
//Handle Login Main Process 
ipcMain.on("api:login", async (event, credentials) => {
    try {
        // console.log("Sending login request to:", `${apiBaseUrl}/login`);
        // console.log("Credentials:", credentials);

        const response = await fetch(`${apiBaseUrl}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const responseData = await response.json();
        console.log("Login response:", responseData);
        if (response.ok) {
          store.set('authToken', responseData.token);
          //store.set('refreshToken', responseData.refreshToken);
          user_id = responseData.id;
          userInfo = {
              id: responseData.id,
              name: responseData.name,
              shift: responseData.shift,
              user_time_zone: responseData.country_time_zone
          };
          store.set('userInfo', userInfo);
          store.set('user_id', responseData.id);
       
          event.reply("api:loginResponse", { success: true, data: responseData });
          startTokenMonitoring();
          checkTodayAtt()
          return { success: true, accessToken: responseData.token };
      } else {
          return { success: false, message: 'Login failed' };
      }

       // await keytar.setPassword('my-electron-app', 'authToken', responseData.token);

       
    } catch (error) {
        console.error("Login error:", error.message);
        event.reply("api:loginResponse", {
            success: false,
            error: error.message || "Login failed"
        });
    }
});

// Fetch user profile
ipcMain.on("api:getProfile", async (event) => {
  try {
    let userInfo = store.get('userInfo');
    let user_id = store.get('user_id');
    let authToken = store.get('authToken');
    console.log(userInfo,'userInfo================Store::')
    console.log(authToken,'authToken================Store::')
    console.log(user_id,'user_id================Store::')
   // let authToken = await keytar.getPassword('my-electron-app', 'authToken');
    if (!authToken) throw new Error("Not authenticated");

    const response = await axios.post(`${apiBaseUrl}/system/getProfile`, { user_id }, {
      headers: { authorization: `bearer ${authToken}` }
    });

    console.log("Profile Details:", response.data);
    event.reply("api:getProfileResponse", {
      success: true,
      data: response?.data?.data,
      user_token: authToken,
    });
  } catch (error) {
    console.error("Profile fetch error:", error.message);
    event.reply("api:getProfileResponse", {
      success: false,
      error: error.response?.data?.error || error.message || "Failed to fetch profile",
    });
  }
});

// Fetch user login time
ipcMain.on("api:getUserLoginTime", async (event) => {
  try {
    let authToken = await keytar.getPassword('my-electron-app', 'authToken');
    if (!authToken) throw new Error("Not authenticated");

    if (!user_id || !userInfo?.shift || !userInfo?.user_time_zone) throw new Error("User information missing");

    const response = await axios.post(`${apiBaseUrl}/system/getUserLoginTime`, {
      user_id,
      shift: userInfo.shift,
      user_time_zone: userInfo.user_time_zone
    }, {
      headers: { authorization: `bearer ${authToken}` }
    });

    event.reply("api:onUserLoginResponse", {
      success: true,
      message: "User login time fetched successfully",
      data: response?.data?.data
    });
  } catch (error) {
    console.error("User login time fetch error:", error.message);
    event.reply("api:onUserLoginResponse", {
      success: false,
      error: error.response?.data?.error || error.message || "Failed to fetch user login time",
    });
  }
});

// Fetch today's attendance list
ipcMain.on("api:todatAttendanceList", async (event) => {
  try {
    let authToken = await keytar.getPassword('my-electron-app', 'authToken');
    if (!authToken) throw new Error("Not authenticated");

    if (!user_id || !userInfo?.shift || !userInfo?.user_time_zone) throw new Error("User information missing");

    const response = await axios.post(`${apiBaseUrl}/system/my-today-att`, {
      user_id,
      shift: userInfo.shift,
      user_time_zone: userInfo.user_time_zone
    }, {
      headers: { authorization: `bearer ${authToken}` }
    });

    event.reply("api:onTodatAttendanceResponse", {
      success: true,
      message: "Attendance data fetched successfully",
      data: response?.data?.data,
    });
  } catch (error) {
    console.error("Attendance fetch error:", error.message);
    event.reply("api:onTodatAttendanceResponse", {
      success: false,
      error: error.response?.data?.error || error.message || "Failed to fetch user attendance",
    });
  }
});


// Handle app quit event
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Prevent unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection:', reason);
});
