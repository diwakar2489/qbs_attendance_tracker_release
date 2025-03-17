const axios = require("axios");
const path = require("path");
const {redirectToLogin,stopTokenMonitoring} = require('../common/commons')
const { getTokens,setLoginActivity } = require("../middleware/store");
const Store = require("electron-store");
//const api = require("./api");
const store = new Store(); // Initialize Electron Store
require("dotenv").config({ path: path.resolve(".env") });

// Function to Fetch Profile
async function getProfile() {
    try {
        const token = getTokens();
       
        if (!token || !token.accessToken) {
            setTimeout(() => {
                redirectToLogin()
            }, 2000);
            throw new Error("User is not logged in or token is missing"); 
        }
        const apiBaseUrl = process.env.API_BASE_URL; // Corrected the URL variable
        if (!apiBaseUrl) {
            throw new Error("API_BASE_URL is not defined in the environment variables");
        }
        if(token.isloggedIn === true){
            
            const response = await axios.post(`${apiBaseUrl}/system/getProfile`,
                {
                    user_id:token.user_id
                },
                {
                    headers: { 
                        "Content-Type": "application/json",
                        "authorization": `bearer ${token.accessToken}`
                    }
                }
            );
            return response.data;
        }
        
    } catch (error) {
        setTimeout(() => {
            redirectToLogin()
        }, 2000);
    }
}
// Function to Fetch User Login Time
async function getUserLoginTime() {
    try {
        const token = getTokens();
     
        if (!token || !token.refreshToken) {
            setTimeout(() => {
                redirectToLogin()
            }, 2000);
            throw new Error("User is not logged in or token is missing"); 
        }
        const apiBaseUrl = process.env.API_BASE_URL; // Corrected the URL variable
        if (!apiBaseUrl) {
            throw new Error("API_BASE_URL is not defined in the environment variables");
        }
        if(token.isloggedIn === true){
            const response = await axios.post(`${apiBaseUrl}/system/getUserLoginTime`,
                {
                    user_id:token.user_id,
                    shift: token.shift,
                    user_time_zone: token.user_time_zone
                },
                {
                    headers: { 
                        "Content-Type": "application/json",
                        "authorization": `bearer ${token.refreshToken}` 
                    }
                }
            );
            return response.data;
        }
        
    } catch (error) {
        setTimeout(() => {
            redirectToLogin()
        }, 2000);
    }
}
async function getTodatAttendanceList() {
    try {
        const token = getTokens();
     
        if (!token || !token.refreshToken) {
            setTimeout(() => {
                redirectToLogin()
            }, 2000);
            throw new Error("User is not logged in or token is missing"); 
        }
        const apiBaseUrl = process.env.API_BASE_URL; // Corrected the URL variable
        if (!apiBaseUrl) {
            throw new Error("API_BASE_URL is not defined in the environment variables");
        }
        if(token.isloggedIn === true){
            const response = await axios.post(`${apiBaseUrl}/system/my-today-att`,
                {
                    user_id:token.user_id,
                    shift: token.shift,
                    user_time_zone: token.user_time_zone
                },
                {
                    headers: { authorization: `bearer ${token.refreshToken}` }
                }
            );
            //console.log(response.data,'Attendance List=====::')
            return response.data;
        }
        
    } catch (error) {
        setTimeout(() => {
            redirectToLogin()
        }, 2000);
    }
}
async function logout() {
    try {
        const token = getTokens();
       // console.log(token,'logout token fetch::');return false;
        if (!token || !token.refreshToken) {
            console.warn("User is not logged in or token is missing");
            await redirectToLogin(); // ✅ Tell main process to load login page
            return { success: false, message: "User is not logged in" };
        }
        const apiBaseUrl = process.env.API_BASE_URL; // Corrected the URL variable
        if (!apiBaseUrl) {
            throw new Error("API_BASE_URL is not defined in the environment variables");
        }
        if (token.isloggedIn === true) {
            const response = await axios.post(
                `${apiBaseUrl}/system/logout`,
                {
                    logout_idle_time: 1,
                    logout_idle_type: "logout",
                    user_id: token.user_id,
                    user_name: token.name,
                    shift: token.shift,
                    user_time_zone: token.user_time_zone,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "authorization": `bearer ${token.refreshToken}`,
                    },
                }
            );

           // console.log(response.data.status, "logout response======================::");

            if (response.data.status === true) {
                // ✅ Logout successful: Redirect to login
               // window.api.redirectLogin(); // ✅ Call main process to load login page
                return { success: true, message: "Logout successful" };
            }
        }
    } catch (error) {
        console.error("Logout error:", error);
        return { success: false, message: "Logout Failed" };
    }
}

module.exports = { getProfile,getUserLoginTime,getTodatAttendanceList,logout };
