const { app,dialog,ipcMain,powerMonitor,net,BrowserWindow,Menu,Tray,nativeImage,Notification } = require("electron");
const path = require("path");
const axios = require("axios");
const { autoUpdater } = require('electron-updater');
const log = require("electron-log");
const AutoLaunch = require('auto-launch');


const appMenu = require('./app/modules/menu/header-menu')
const { login } = require("./app/services/auth");
const { getProfile,getUserLoginTime,getTodatAttendanceList,logout} = require("./app/services/user_api");
const {startTokenMonitoring,redirectToLogin,startIdleMonitoring,MonitoringStatus,sendDataToServer,userTimeout} = require("./app/common/commons")
const { getTokens,setLoginActivity,getLoginActivity } = require("./app/middleware/store");
const Store = require("electron-store");
const store = new Store(); // Initialize Electron Store
require("dotenv").config({ path: path.join(__dirname, ".env") });
log.transports.file.resolvePath = () => `${__dirname}/logs/main.log`;

//const ghToken = process.env.GH_TOKEN;
let mainWindow;
let tray = null;

async function  createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true, // Start show
        icon: path.join(__dirname, "app/assets/img/favicon.png"),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
    });
    // Set up autoUpdater with GitHub repository and token
    // autoUpdater.setFeedURL({
    //     provider: 'github',
    //     owner: 'diwakar2489',
    //     repo: 'qbs_attendance_tracker_release',
    //     token: ghToken // Use the token here
    // });
    // Handle minimize (hide to tray)
    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.hide();
        showNotification("QbslearningATS", "The app has been minimized. Click the tray icon to restore it.");
    });
     // Handle close (hide instead of quitting)
     mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
            showNotification("QbslearningATS", "The app is running in the background. Access it from the system tray.");
        }
    });
    // macOS: Show window when clicking the dock icon
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
            showNotification("QbslearningATS", "App is activate!");
        } else {
            mainWindow.show();
        }
    });
    // Remove default context menu (Right-click)
    mainWindow.webContents.on("context-menu", (event) => {
        event.preventDefault(); // Disable right-click
    });

    // Prevent Developer Tools (Ctrl+Shift+I)
    mainWindow.webContents.on("before-input-event", (event, input) => {
        if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === "i") {
            event.preventDefault();
        }
    });

    // Optional: Hide menu bar (Windows/Linux)
   // mainWindow.setMenu(null);
   Menu.setApplicationMenu(appMenu);
    
}
// Function to create the system tray
async function createTray() {
    const iconPath = process.platform === 'darwin'
        ? path.join(__dirname, 'app/assets/img/favicon.png') // macOS icon
        : path.join(__dirname, 'app/assets/img/favicon.png');   // Windows/Linux icon

    tray = new Tray(nativeImage.createFromPath(iconPath));
    tray.setToolTip('QbslearningATS App');

    // Tray Menu
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show App', click: () => mainWindow.show() },
        { label: 'Exit', click: () => { app.isQuiting = true; app.quit(); } },
    ]);

    tray.setContextMenu(contextMenu);

    // Left-click behavior: Show/Hide window
    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
        }
    });
}
// Function to show notifications
function showNotification(title, body) {
    if (Notification.isSupported()) {
        new Notification({ title, body, icon: path.join(__dirname, 'app/assets/img/favicon.png')}).show();
    }
}

// Enable Auto-Start on System Boot (Windows/macOS)
app.setLoginItemSettings({
    openAtLogin: true,  // Windows & macOS
    openAsHidden: true, // macOS only
});

const appLauncher = new AutoLaunch({
    name: 'QbslearningATS',
    path: app.getPath('exe'),
  });
  
 const setupAutoLaunch  = async () => {
    const isEnabled = await appLauncher.isEnabled();
  
    if (!isEnabled) {
      try {
        await appLauncher.enable();
        showNotification("QbslearningATS", " App is Launch successfully!");
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

// autoUpdater.on('download-progress', (progress) => {
//     let percent = Math.floor(progress.percent);
//     console.log(`Download progress: ${percent}%`);

//     // Update the app's progress bar in the taskbar (Windows/macOS)
//     if (mainWindow) {
//         mainWindow.setProgressBar(progress.percent / 100);
//     }

//     // Show a progress dialog (Optional)
//     dialog.showMessageBox({
//         type: 'info',
//         title: 'Downloading Update',
//         message: `Downloading update... ${percent}% completed.`,
//         buttons: ['OK']
//     });
// });


let progressDialogShown = false;
autoUpdater.on('download-progress', (progress) => {
    let percent = Math.floor(progress.percent);
    console.log(`Download progress: ${percent}%`);

    // Update the app's progress bar in the taskbar (Windows/macOS)
    if (mainWindow) {
        mainWindow.setProgressBar(progress.percent / 100);
    }

    // Show a progress dialog only once and update it dynamically
    if (!progressDialogShown) {
        progressDialogShown = true;

        dialog.showMessageBox({
            type: 'info',
            title: 'Downloading Update',
            message: `Downloading update... ${percent}% completed.`,
            buttons: ['OK']
        }).then(() => {
            progressDialogShown = false; // Allow dialog to show again after completion
        });
    }
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
app.whenReady().then( async () => {
    await createMainWindow();
    await setupAutoLaunch();
    await createTray();
    app.setAppUserModelId("Qbsconnect");
   const tokens = store.get("userSession");
    if(tokens?.isloggedIn === true){
       // store.delete('userSession')
        mainWindow.loadFile(path.join(__dirname, "app/modules", "./dashboard/dashboard.html")); 
       await startTokenMonitoring()
       showNotification("QbslearningATS", "App is login successfully!");
    }else{
        store.delete('userSession')
        store.delete('app_last_activity')
        setLoginActivity(1);
        mainWindow.loadFile(path.join(__dirname, "app/modules", "./login/login.html"));
        showNotification("QbslearningATS", "Your token has expired. Please try logging in again.");
    }
    if (!app.isPackaged || process.env.NODE_ENV === 'development') {
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

    // Check network status every 10 seconds
  //  setInterval(() => checkNetworkStatus(mainWindow), 10000);
     
});
// Handle login when online
ipcMain.on("user-online", async (event) => {
    store.set('app_last_activity', { last_activity: 1 });
    const loginActivity = await getLoginActivity()
    if(loginActivity.last_activity === 1){
        console.log("User is online. Calling mark attendance...");
        await sendDataToServer();
    }
  });
  
  // Handle logout when offline
  ipcMain.on("user-offline", async (event) => {
      await userTimeout()
  });
// Handle Session Event
ipcMain.handle("get-tokens", async () => {
    return getTokens("userSession"); // Adjust key if needed
});
// Handle startTokenMonitoring Event
ipcMain.handle("start-token-monitoring", async () => {
    return startTokenMonitoring(); // Call function
});
// Handle Login Event
ipcMain.handle("login", async (event,{email, password}) => {
    return await login(email, password);
});
// Handle IPC event to provide idle time
ipcMain.handle("get-idle-time", async () => {
    return powerMonitor.getSystemIdleTime();
});
// Handle IPC event to provide idle state
ipcMain.handle("get-idle-state", async (event, threshold) => {
    return powerMonitor.getSystemIdleState(threshold); // Returns 'active', 'idle', or 'locked'
});
ipcMain.handle("get-idle-monitoring", async () => {
    return MonitoringStatus()
});
// Handle Fetch Profile Event
ipcMain.handle("getProfile", async () => {
    return await getProfile();
});
// Handle Fetch UserLoginTime Event
ipcMain.handle("getUserLoginTime", async () => {
    return await getUserLoginTime();
});
// Handle Fetch Attendance List Event
ipcMain.handle("todatAttendanceList", async () => {
    return await getTodatAttendanceList();
});
// Handle Logout Event
ipcMain.handle("logout", async (event) => {
    return await logout();
});
// ✅ Handle IPC request for lock status
powerMonitor.on('lock-screen', async () => {
    try {
        const idleTime = powerMonitor.getSystemIdleTime();
        console.log(`Idle Time: ${idleTime}`);

        const authToken = store.get("userSession");
        if (!authToken || !authToken.refreshToken) {
            throw new Error('Authentication token not found or invalid');
        }

        const payload = {
            idle_time: idleTime || 0,
            idle_status: 'locked',
            user_id: authToken.user_id || '',
            user_name: authToken.name || '',
            shift: authToken.shift || '',
            user_time_zone: authToken.user_time_zone || '',
        };

        console.log("Sending request with payload:", payload);

        const response = await axios.post(`${process.env.API_BASE_URL}/system/activity-check`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'authorization': `bearer ${authToken.refreshToken}`,
            },
        });

        console.log("API Response:", response.status, response.data);

        if (response.status === 200) {
           // console.log('Lock event successfully sent to API:', response.data.last_activity);
            
            store.set('app_last_activity', { last_activity: 1 });
            await startTokenMonitoring()
        } else {
            throw new Error(`Unexpected response status: ${response.status}`);
        }

    } catch (error) {
        if (error.response) {
            console.error('API Response Error:', error.response.status, error.response.data);
        } else {
            console.error('Request Error:', error.message);
        }
    }
});
// ✅ Listen for request to load the dashboard
ipcMain.on("load-dashboard", (event) => {
    mainWindow.loadFile(path.join(__dirname, "App/modules", "./dashboard/dashboard.html"));
});
// ✅ Listen for request to load the dashboard
ipcMain.on("load-login", async (event) => {
    mainWindow.loadFile(path.join(__dirname, "App/modules", "./login/login.html"));
});
ipcMain.on("redirect-login", async (event) => {
    return await redirectToLogin();
});
// Handle app quit event
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
