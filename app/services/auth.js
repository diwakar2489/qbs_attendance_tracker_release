//const api = require("./api");
const axios = require("axios");
const path = require("path");
const { setTokens, clearTokens,setLoginActivity } = require("../middleware/store");
require("dotenv").config({ path: path.resolve(".env") });
// Function to Handle Login
async function login(email, password) {
    try {
        const apiBaseUrl = process.env.API_BASE_URL; // Corrected the URL variable
        if (!apiBaseUrl) {
            throw new Error("API_BASE_URL is not defined in the environment variables");
        }
       // console.log("API Base URL:", api.defaults.baseURL,'env url:',process.env.NODE_ENV);
        const response = await axios.post(`${apiBaseUrl}/system/login`, 
                { email, password },
                {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
           // console.log(response,'login===::');return false
            if (response?.data?.status === true) {
                let Token = response.data.token ? response.data.token:'';
                let RefreshToken = response.data.refresh_token ? response.data.refresh_token:'';
                let Username = response.data.name ? response.data.name: '';
                let Usershift = response.data.shift ? response.data.shift:'';
                let User_id = response.data.id ? response.data.id:'';
                let user_time_zone = response.data.country_time_zone ? response.data.country_time_zone:'';
                let isloggedIn = true;
               setTokens(Token,RefreshToken,Username,Usershift,User_id,user_time_zone,isloggedIn);
               console.log("Login successful! Tokens saved.");
               setLoginActivity(1);
                
                return {
                    success: true,
                    message: "Login successful",
                };
              
                
            } else {
              clearTokens();
              return {
                    success: false,
                    message: "No access token received",
                };
            }
        
    } catch (error) {
       // console.error("Login failed:", error.message);
        clearTokens();
        return { success: false, message: "Login failed" };
    }
}

module.exports = { login };
