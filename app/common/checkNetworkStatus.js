const { net } = require("electron");
const {sendDataToServer} = require("../common/commons");
const {setLoginActivity,getLoginActivity} = require("../middleware/store")

async function checkNetworkStatus(mainWindow) {
    if (!mainWindow || mainWindow.isDestroyed()) {
        console.error("Main window is not available.");
        return;
    }

    const request = net.request("https://www.google.com");

    request.on("response",async (response)  => {
        if (response.statusCode >= 200 && response.statusCode < 400) {
            console.log("Online");
           const loginActivity = await getLoginActivity()
           console.log(loginActivity,'loginActivity is online')
            mainWindow.webContents.send("network-status", true);
        } else {

            console.log("Offline (Unexpected response)");
            mainWindow.webContents.send("network-status", false);
            setLoginActivity(11);
           await sendDataToServer();
        }
    });

    request.on("error", (error) => {
        console.log("Offline (Network error)", error.message);
        mainWindow.webContents.send("network-status", false);
    });

    request.end();
}

module.exports = { checkNetworkStatus };
