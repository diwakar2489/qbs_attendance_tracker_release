
//const {logout} = require('../../services/user_api')
//const Store = require("electron-store");
//const store = new Store(); // Initialize Electron Store

// ✅ Cache DOM elements for better performance
const elements = {
    profileDiv: document.getElementById("profile"),
    sidebarProfile: document.getElementById("sidebar_profile"),
    empCode: document.getElementById("emp_code"),
    empEmail: document.getElementById("emp_email"),
    empDOB: document.getElementById("emp_dob"),
    empReportingManager: document.getElementById("emp_reporting_manager"),
    roleName: document.getElementById("role_name"),
    deptName: document.getElementById("dept_name"),
    skillName: document.getElementById("skill_name"),
    systemRole: document.getElementById("system_role"),
    workLocation: document.getElementById("working_location"),
    shiftTime: document.getElementById("shift_time"),
    firstLoginTime: document.getElementById("first_login"),
    lastLogoutTime: document.getElementById("last_logout"),
    totalWorkingHrs: document.getElementById("totalWorkingHrs"),
    logoutButton: document.getElementById("logoutButton")
};
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
}

const idleTimeSpan = document.getElementById("idle-time"); // Add this in HTML
const idleStateSpan = document.getElementById("idle-state"); // Add this in HTML

async function activeIdleState() {
    try {
        const idleTime = await window.api.getIdleTime();
        const idleState = await window.api.getIdleState(300); // Ensure `getIdleState` exists

        // Update UI
        idleTimeSpan.textContent = formatTime(idleTime);
        idleStateSpan.textContent = idleState;

        console.log('Activity Log:', idleState, 'Idle Time:', idleTime);
    } catch (error) {
        console.error("Error fetching idle state:", error);
    }
}
setInterval(activeIdleState, 5000);
activeIdleState()
// ✅ Attach Logout Button Event Listener
if (elements.logoutButton) {
    elements.logoutButton.addEventListener("click", async (e) => {
        e.preventDefault();
        const btnloader = document.getElementById("btn-loader");
        btnloader.style.display = "inline-block"; // Show loader
        const Mainloader = document.getElementById("main-loader");
        Mainloader.style.display = "inline-block"; // Show loader
        await logoutUser();
    });
}
// ✅ Event Listeners for when the page loads
document.addEventListener("DOMContentLoaded", async () => {
    fetchProfile();
    fetchUserLoginTime();
    fetchUserTodayAttendanceList();
    const userSession = await window.api.getTokens();
  //  console.log(userSession,'fetch user details:=========')
    const btnloader = document.getElementById("btn-loader");
    btnloader.style.display = "none"; // Show loader

    // Check initial networkStatus
    const isOnline = window.networkStatus.checkStatus();
    updateStatus(isOnline);
    window.networkStatus.notifyMain(isOnline);

    // Listen for network changes
    window.networkStatus.onOnline(() => {
        updateStatus(true);
        window.networkStatus.notifyMain(true);
    });
    window.networkStatus.onOffline(() => {
        updateStatus(false);
        window.networkStatus.notifyMain(false);
    });
});
// Function to update the UI
function updateStatus(isOnline) {
    const statusText = document.getElementById("internet-status");
    statusText.textContent = isOnline ? "🟢 Internet Connected" : "🔴 No Internet Connection";
    statusText.style.color = isOnline ? "green" : "red";
  }
// ✅ Fetch Profile Function
async function fetchProfile() {
    try {
        // Show loader before making API calls
        const loader = document.getElementById("main-loader");
        loader.style.display = "inline-block"; // Show loader

        const response = await window.api.getProfile();
        const userSession = await window.api.getTokens();
      
        if (!response || response.status !== true) {
           
            console.error("Error fetching profile:", response?.error || "Unknown error");
            elements.profileDiv.textContent = "Error loading profile.";
            return;
        }
        // Hide loader after getting the response
        loader.style.display = "none";
        // ✅ Populate UI with user data
        elements.profileDiv.innerText = `Hello, ${userSession?.name || "User"}`;
        elements.sidebarProfile.textContent = response.data?.name || "N/A";
        elements.empCode.textContent = response.data?.user_code || "N/A";
        elements.empEmail.textContent = response.data?.email || "N/A";
        elements.empDOB.textContent = formatDate(response.data?.birthday);
        elements.empReportingManager.textContent = response.data?.Reporting_manager || "N/A";
        elements.roleName.textContent = response.data?.division_name || "N/A";
        elements.deptName.textContent = response.data?.department_name || "N/A";
        elements.skillName.textContent = response.data?.skill_name || "N/A";
        elements.systemRole.textContent = response.data?.system_role || "N/A";
        elements.workLocation.textContent = response.data?.working_location || "N/A";

        // ✅ Handle shift display dynamically
        const shiftText = {
            1: "General Shift",
            2: "Flexible Shift",
            3: "Night Shift",
        };
        elements.shiftTime.textContent = shiftText[response.data?.shift] || "Unknown Shift";
    
    } catch (error) {
        console.error("Failed to load profile:", error);
        elements.profileDiv.textContent = "Error loading profile.";
    }
}

// ✅ Fetch User Login Time
async function fetchUserLoginTime() {
    try {
        const loader = document.getElementById("main-loader");
        loader.style.display = "block"; // Show loader
        const response = await window.api.getUserLoginTime();
        console.log(response,'fetchUserLoginTime=============::')
        if (!response || !response.data) {
            console.error("Error fetching login Time details:", response?.error || "Unknown error");
            return;
        }
        loader.style.display = "none"; // hide loader
        // ✅ Populate login details
        elements.firstLoginTime.textContent = response.data?.login_time;
        elements.lastLogoutTime.textContent = response.data?.logout_time;
        elements.totalWorkingHrs.textContent = response.data?.total || "N/A";
    } catch (error) {
        console.error("User Login Time Issue:", error);
    }
}
// ✅ Fetch User Attendance List
async function fetchUserTodayAttendanceList() {
    try {
        const loader = document.getElementById("main-loader");
        loader.style.display = "block"; // Show loader
        const response = await window.api.todatAttendanceList();
        console.log(response,'todatAttendanceList=============::')
        if (!response || !response.data) {
            console.error("Error fetching Attendance List:", response?.error || "Unknown error");
            return;
        }
        const tableBody = document.getElementById("attendanceBody");
        // Clear existing table rows
        tableBody.innerHTML = "";

        if (response.status && Array.isArray(response.data)) {
            response.data.forEach((item, index) => {
            const row = document.createElement("tr");
          
            // Create table cells
            const srNoCell = document.createElement("td");
            srNoCell.textContent = index + 1;

            const startTimeCell = document.createElement("td");
            startTimeCell.textContent = item.first_time || "N/A";

            const endTimeCell = document.createElement("td");
            endTimeCell.textContent = item.last_time || "N/A";

            const totalHoursCell = document.createElement("td");
            totalHoursCell.textContent = item.total_work_time || "N/A";

            // Append cells to the row
            row.appendChild(srNoCell);
            row.appendChild(startTimeCell);
            row.appendChild(endTimeCell);
            row.appendChild(totalHoursCell);

            // Append row to the table body
            tableBody.appendChild(row);
            });
        } else {
            const emptyRow = document.createElement("tr");
            const emptyCell = document.createElement("td");
            emptyCell.setAttribute("colspan", "4");
            emptyCell.textContent = "No attendance data available.";
            emptyRow.appendChild(emptyCell);
            tableBody.appendChild(emptyRow);

            console.error("Error or empty data:", response.error || "No data.");
        }
    } catch (error) {
        console.error("User Attendance List Issue:", error);
    }
}
async function logoutUser() {
    try {
        const response = await window.api.logout();
        const UserSessionInfo = await window.api.getTokens();
       // console.log(response,'logout====::')
        const AlertMSG = document.getElementById("logoutMsg");
        if(response.success){
            AlertMSG.textContent = `Logout, ${UserSessionInfo?.name || "User"}! Redirecting login...`;
            setTimeout( async () => {
                await window.api.redirectLogin();
            }, 2000);
        }else{
            AlertMSG.textContent = `Logout Issue, ${UserSessionInfo?.name || "User"}!`;
            document.getElementById("btn-loader").style.display = "none";
            document.getElementById("main-loader").style.display = "none";
        }
       //await logout(user_id)
       // window.location.href = "login.html"; // Redirect to login page after logout
    } catch (error) {
        document.getElementById("btn-loader").style.display = "none";
        document.getElementById("main-loader").style.display = "none";
       // console.error("Logout failed:", error);
    }
}

// ✅ Date Formatting Function
function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
// ✅ Date-Time Formatting Function
// function formatDateTime(dateTimeString) {
//     if (!dateTimeString) return "N/A";
//     const date = new Date(dateTimeString);
//     return date.toLocaleString("en-US", { 
//         year: "numeric", 
//         month: "long", 
//         day: "numeric", 
//         hour: "2-digit", 
//         minute: "2-digit",
//         second: "2-digit" 
//     });
// }
 document.getElementById("logoutButton").addEventListener("click", logoutUser);
