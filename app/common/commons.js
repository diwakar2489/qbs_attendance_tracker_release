const axios = require("axios");
const path = require("path");
const fs = require("fs");
const log = require("electron-log");
const { BrowserWindow ,powerMonitor } = require("electron");
const { setTokens,getTokens,setLoginActivity,getLoginActivity } = require("../middleware/store");
const Store = require("electron-store");
//const api = require('../services/api');
const assert = require("assert");
const store = new Store(); // Initialize Electron Store
require("dotenv").config({ path: path.resolve(".env") });
let app_last_activity =  store.get("app_last_activity");
console.log(app_last_activity,'app_last_activity====::')

let threshold = 300;

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
        store.delete('userSession')
        store.delete('app_last_activity')
      throw new Error("Invalid token");
    }
}
let tokenCheckInterval;

const startTokenMonitoring = async () => {
    // Clear any existing intervals before setting a new one
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
    }

    tokenCheckInterval = setInterval(async () => {
        try {
            const userSession = await getTokens();
            
            // Check if the user session and refresh token exist
            if (!userSession || !userSession.refreshToken) {
                console.warn("Auth token missing. Redirecting to login page...");
                handleInvalidSession();
                return;
            }

            let decoded;
            try {
                decoded = await decodeJWT(userSession.refreshToken);
            } catch (err) {
                console.error("Error decoding token:", err);
                handleInvalidSession();
                return;
            }

            const currentTime = Math.floor(Date.now() / 1000);

            // If token is expired, attempt to refresh it
            if (decoded.exp < currentTime) {
                console.warn("Token expired. Attempting to refresh...");
                try {
                    await refreshToken();
                } catch (refreshError) {
                    console.error("Failed to refresh token:", refreshError);
                    handleInvalidSession();
                    return;
                }
            } else {
                console.log("Token is still valid.");
                await startIdleMonitoring(); // Handle user inactivity if needed
            }
        } catch (error) {
            console.error("Error during auth token check:", error.message);
        }
    }, 10000); // Token check runs every 10 seconds
};

/**
 * Handles invalid session by clearing stored session data and redirecting to login.
 */
const handleInvalidSession = () => {
    store.delete("userSession");
    store.delete("app_last_activity");
    setLoginActivity(1);
    redirectToLogin();
    clearInterval(tokenCheckInterval);
};

const refreshToken = async () => {
    try {
        const userSession = await getTokens() || {};
        const apiBaseUrl = process.env.API_BASE_URL; // Corrected the URL variable
        if (!apiBaseUrl) {
            throw new Error("API_BASE_URL is not defined in the environment variables");
        }
        const response = await axios.post(`${apiBaseUrl}/system/refresh-token`, 
            {
                refreshToken: userSession.accessToken,
            },
            {
                // Headers (Separate Argument)
                headers: {
                    'Content-Type': 'application/json',
                    'authorization':`bearer ${userSession.accessToken}`
                }
            }
        );
       // console.log(response,'===============response refresh Token================')
        const newAccessToken = response.data.token;
        if (!newAccessToken) throw new Error("No new access token received");

        let Token = response.data.token ? response.data.token:'';
        let RefreshToken = response.data.refresh_token ? response.data.refresh_token:'';
        let Username = response.data.name ? response.data.name: '';
        let Usershift = response.data.shift ? response.data.shift:'';
        let User_id = response.data.id ? response.data.id:'';
        let user_time_zone = response.data.country_time_zone ? response.data.country_time_zone:'';
        let isloggedIn = true;
       setTokens(Token,RefreshToken,Username,Usershift,User_id,user_time_zone,isloggedIn);
       console.log("Refresh Token successful! Tokens saved.");
       setLoginActivity(1);
       await startTokenMonitoring();
        // setTokens(
        //     newAccessToken,
        //     userSession.refreshToken,
        //     userSession.name,
        //     userSession.shift,
        //     userSession.user_id,
        //     userSession.user_time_zone,
        //     true
        // );
        // await startTokenMonitoring();
      //  return newAccessToken;
    } catch (error) {
        console.log('Token refresh not::',error)
        store.delete("userSession");
        store.delete("app_last_activity");
        setLoginActivity(1);
        redirectToLogin();
    }
}
function MonitoringStatus() {
    let idleTime = powerMonitor.getSystemIdleTime();
    let idleState = powerMonitor.getSystemIdleState(threshold);

    console.log(`Idle Time: ${idleTime} seconds`);
    console.log(`Idle State: ${idleState}`);

    return { idleTime, idleState }; // Return data to Renderer
}
const  startIdleMonitoring = async () => {
   // const idleTime = powerMonitor.getSystemIdleTime();
   // const idleState = powerMonitor.getSystemIdleState(threshold); // 'active', 'idle', or 'locked'
   const userMoniteringStatus = await MonitoringStatus()
   const userSession = await getTokens();
   const loginActivity = await getLoginActivity('app_last_activity');
   //console.log(userSession,'userSession=============== userMoniteringStatus======::' )
console.log('======================startIdleMonitoring start========================')
//console.log(userMoniteringStatus,'userMoniteringStatus===============')
   console.log('idleState',userMoniteringStatus.idleState)
   console.log('app_last_activity',app_last_activity.last_activity)
   console.log('loginActivity',loginActivity)
   console.log('======================startIdleMonitoring end========================')
    if (userMoniteringStatus.idleState === 'active' && loginActivity.last_activity === 1) {
    log.warn({ message: "System is active", status: "active" });
    log.info("System is active idleTime", userMoniteringStatus.idleTime);
    await sendDataToServer();
    // await checkTodayAtt()

    } else if (userMoniteringStatus.idleState === 'idle'  && loginActivity.last_activity === 2) {
    log.warn({ message: "System is Idle", status: "Idle" });
    log.info("System is idle idleTime", userMoniteringStatus.idleTime);
    await sendDataToServer();
    // await checkTodayAtt()
    }else if(userMoniteringStatus.idleState === 'active'  && loginActivity.last_activity === 2){
        
        if(loginActivity.last_activity === 1){
            const checkStartTime = await checkTodayAtt()
            await setLoginActivity(checkStartTime.last_activity );
            console.log(checkStartTime.last_activity,'App is close Running')
        }else if(loginActivity.last_activity === 2){
            await setLoginActivity(2);
            console.log(loginActivity.last_activity,'App is open Running ')
        }
    }else if(userMoniteringStatus.idleState === 'active'  && loginActivity.last_activity === 3){
        await setLoginActivity(2);
        console.log(loginActivity.last_activity,'App is Restart Running ')
    }
}
const sendDataToServer = async () => {
    try {
       // console.log(app_last_activity.last_activity, 'app_last_activity.last_activity=====::');
       // const idleTime = powerMonitor.getSystemIdleTime();
        const userMoniteringStatus = await MonitoringStatus()
        const apiBaseUrl = process.env.API_BASE_URL; // Corrected the URL variable
        if (!apiBaseUrl) {
            throw new Error("API_BASE_URL is not defined in the environment variables");
        }
        const authToken = await getTokens('userSession');
        // Ensure authToken exists
        if (!authToken) {
            console.error("Authentication token is missing.");
            return;
        }
        const loginActivity = await getLoginActivity('app_last_activity');
        if ((userMoniteringStatus.idleState === "idle" && loginActivity.last_activity === 2) ||
            (userMoniteringStatus.idleState === "active" && loginActivity.last_activity === 1) || 
            (userMoniteringStatus.idleState === "active" && loginActivity.last_activity === 11))
        {
            let finalStatus;
           if(loginActivity.last_activity === 2 && userMoniteringStatus.idleState === "idle"){
                finalStatus = 'idle'
           }else if(loginActivity.last_activity === 1 && userMoniteringStatus.idleState === "active"){
                finalStatus = 'active'
           }else if(loginActivity.last_activity === 11 && userMoniteringStatus.idleState === "active"){
                finalStatus = 'offline'
           }
            // ✅ Correctly structured axios POST request
            const response = await axios.post(
                `${apiBaseUrl}/system/activity-check`,
                { // Request Body (JSON)
                    idle_time: userMoniteringStatus.idleTime,
                    idle_status: finalStatus,
                    user_id: authToken.user_id,
                    user_name: authToken.name,
                    shift: authToken.shift,
                    user_time_zone: authToken.user_time_zone,
                },
                { // Headers (Separate Argument)
                    headers: {
                        'Content-Type': 'application/json',
                        'authorization': `bearer ${authToken.refreshToken}`,
                    }
                }
            );
           // console.log(response.data?.last_activity,'response after call')
            // ✅ Correct response check
            if (response.status === 200 ) {
                //console.log('User activity Success======================::', response.data);
               
               const checkUserLastActivity = await checkTodayAtt(response.data.last_activity)
               if(checkUserLastActivity.last_activity === 1){
                await setLoginActivity(checkUserLastActivity.last_activity );
                console.log(checkUserLastActivity.last_activity,'close update')
               }else if(checkUserLastActivity.last_activity === 2)
               {
                await setLoginActivity(checkUserLastActivity.last_activity );
                console.log(checkUserLastActivity.last_activity,'2 open update')
               }else{
                await setLoginActivity(1);
                console.log(loginActivity.last_activity,'else 1 update')
               }
                // app_last_activity = { last_activity: response.data.last_activity };
            } else {
                console.error("Unexpected response format:", response);
            }
        }
    } catch (error) {
        console.log("Something went wrong:", error.response ? error.response.data : error.message);
    }
};

const checkTodayAtt = async (activity) => {
    try {
        // Retrieve auth token securely
        const authToken = await getTokens("userSession");
       // console.log(authToken, "checkToday==========::");

        if (!authToken) {
            console.error("Authentication token is missing.");
            return;
        }
        const apiBaseUrl = process.env.API_BASE_URL; // Corrected the URL variable
        if (!apiBaseUrl) {
            throw new Error("API_BASE_URL is not defined in the environment variables");
        }
        // Prepare request body
        const requestBody = {
            user_id: authToken.user_id,
            user_name: authToken.name,
            shift: authToken.shift,
            user_time_zone: authToken.user_time_zone,
        };

        // Perform API request with proper headers and body placement
        const response = await axios.post(
            `${apiBaseUrl}/system/today-att`,
            requestBody, // ✅ Correct placement of request body
            {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": `bearer ${authToken.refreshToken}`,
                },
            }
        );
        // ✅ Correct way to check response
        if (response.last_activity === 2 ) {
            await setLoginActivity(2)
            return response.data;
        } else if(response.last_activity === 1){
           await setLoginActivity(1)
           // await sendDataToServer()
            return response.data;
        }else if(response.last_activity === 3){
            await setLoginActivity(3)
            return response.data;
        }else{
            await setLoginActivity(1)
            return response.data;
        }
    } catch (error) {
        console.error("Error in checkTodayAtt:", error.response ? error.response.data : error.message);
    }
};
const redirectToLogin = async () => {
    await stopTokenMonitoring();
    const allWindows = BrowserWindow.getAllWindows(); // Get all open Electron windows
    await store.delete("userSession");
    await store.delete("app_last_activity");
    setLoginActivity(1);
    allWindows.forEach(win  => {
        if (win) {
          
            const loginPageUrl = `file://${path.join(__dirname, '../modules/login/login.html')}`;
            win.loadURL(loginPageUrl); // Redirect window to login page
           // console.log("Redirecting to:", loginPageUrl);
        }
    });
}
const stopTokenMonitoring = async () => {
    if (tokenCheckInterval) {
        await store.delete('userSession');  // Clear tokens
        await store.delete('app_last_activity');  // Clear tokens
        setLoginActivity(1);
    await clearInterval(tokenCheckInterval);
    console.log("Token monitoring stopped.");
    }
}
const userTimeout = async () =>{
    try{
        const idleTime = powerMonitor.getSystemIdleTime();
        const authToken = store.get("userSession");
        if (!authToken || !authToken.refreshToken) {
            throw new Error('Authentication token not found or invalid');
        }

        const payload = {
            idle_time: idleTime || 0,
            idle_status: 'offline',
            user_id: authToken.user_id || '',
            user_name: authToken.name || '',
            shift: authToken.shift || '',
            user_time_zone: authToken.user_time_zone || '',
        };

        console.log("Sending request with payload:", payload);

        const response = await axios.post(`${process.env.API_BASE_URL}/system/time-out`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'authorization': `bearer ${authToken.refreshToken}`,
            },
        });

        console.log("API Response:", response.status, response.data);

        if (response.status === 200) {
           // console.log('Lock event successfully sent to API:', response.data.last_activity);
            
            store.set('app_last_activity', { last_activity: 11 });
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
}


module.exports = { decodeJWT,startTokenMonitoring,startIdleMonitoring,sendDataToServer,checkTodayAtt,redirectToLogin,stopTokenMonitoring,MonitoringStatus,userTimeout };