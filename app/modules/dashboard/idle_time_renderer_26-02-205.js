const idleTimeSpan = document.getElementById('idle-time');
const idleStateSpan = document.getElementById('idle-state');
// const logoutButton = document.getElementById("logoutButton");

// logoutButton.addEventListener("click", () => {
//     window.api.logout(); // Trigger logout
// });


// Update idle time and state every 5 seconds
setInterval(async () => {
  const idleTime = await window.api.getIdleTime();
  const idleState = await window.api.getIdleState(1200); // Threshold = 60s
  idleTimeSpan.textContent = idleTime;
  idleStateSpan.textContent = idleState;
}, 5000);


const logoutForm = document.getElementById("logoutButton");
const messageLogoutDiv = document.getElementById("logoutMsg");

	
	logoutForm.addEventListener("click", (e) => {
  	e.preventDefault();

	const logout_idle_time = 1;
	const logout_idle_type = 'logout';
	//alert(user_id)
  window.api.logout({ user_id,user_name,shift,logout_idle_type,logout_idle_time });
  window.api.onlogoutResponse((response) => {
    if (response.success) {
      messageLogoutDiv.textContent = `Logout, ${response.data.name}! Redirecting...`;
      setTimeout(() => {
        window.location = "./index.html";
      }, 2000);
    } else {
		messageLogoutDiv.textContent = `Error: ${response.error}`;
    }
  });
});

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
window.api.getProfile();
window.api.onProfileResponse((response) => {
  console.log(response,'response profile======================::')
  console.log(response?.user_token,'response user_token======================::')
  const profileDiv = document.getElementById("profile");
  const SidebarDiv = document.getElementById("sidebar_profile");
  const EmpDiv = document.getElementById("emp_code");
  const EmpEmailDiv = document.getElementById("emp_email");
  const EmpDOBDiv = document.getElementById("emp_dob");
  const EmpReportingManagerDiv = document.getElementById("emp_reporting_manager");
  const role_nameDiv = document.getElementById("role_name")
  const dept_nameDiv = document.getElementById("dept_name")
  const skill_nameDiv = document.getElementById("skill_name")
  const system_roleDiv = document.getElementById("system_role");
  const WorkLocationDiv = document.getElementById("working_location")
  const shift_timeDiv = document.getElementById("shift_time");


  // const goConnectDiv = document.getElementById("connect_link");
  

  const formattedDateOfJoining = formatDate(response?.data?.birthday);
  if (response.success) {
    profileDiv.textContent = `Hello, ${response.data.name}`;
    SidebarDiv.textContent = `${response.data.name}`;
    EmpDiv.textContent = response.data.user_code;
    EmpEmailDiv.textContent = response.data.email;
    EmpDOBDiv.textContent = formattedDateOfJoining;//response.data.birthday;
    EmpReportingManagerDiv.textContent = response.data.Reporting_manager;
    role_nameDiv.textContent = response.data.division_name;
    dept_nameDiv.textContent = `${response.data.department_name}`;
    skill_nameDiv.textContent = response.data.skill_name;
    system_roleDiv.textContent = response.data.system_role;
    WorkLocationDiv.textContent = response.data.working_location?response.data.working_location:'null';
    if(response.data?.shift === 1){
      shift_timeDiv.textContent = 'General Shift';
    }else if(response.data?.shift === 2){
      shift_timeDiv.textContent = 'Flexible Shift';
    }else if(response.data?.shift === 3){
      shift_timeDiv.textContent = 'Night Shift';
    }
    //shift_timeDiv.textContent = response.data?.shift_type?response.data.shift_type+' Shift':'Free time Shift';
  } else {
    profileDiv.textContent = `Error: ${response.error}`;
  }
});
//setInterval(async () => {
window.api.getUserLoginTime();
window.api.onUserLoginResponse((response) => {
  const FirstloginTime = document.getElementById("first_login");
  const lastlogoutTime = document.getElementById("last_logout");
  const totalWorkingHrs = document.getElementById("totalWorkingHrs");
  if (response.success) {
    FirstloginTime.textContent = response.data.login_time;
    lastlogoutTime.textContent = response.data.logout_time;
    totalWorkingHrs.textContent = response.data.total;
  }else{
    FirstloginTime.textContent = `---`;
    lastlogoutTime.textContent = `---`;
    totalWorkingHrs.textContent = `---`;
  }
});
//},10000);
//setInterval(async () => {
window.api.todatAttendanceList();
window.api.onTodatAttendanceResponse((response) => {
  console.log(response, "Today's Attendance Response");

  const tableBody = document.getElementById("attendanceBody");

  // Clear existing table rows
  tableBody.innerHTML = "";

  if (response.success && Array.isArray(response.data)) {
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
});
//},10000)

