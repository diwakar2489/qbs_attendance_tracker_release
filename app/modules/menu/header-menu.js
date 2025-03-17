const { Menu } = require("electron");

const menuTemplate = [
    {
        label: "Home"
        // submenu: [
        //     { label: "Open", click: () => console.log("Open clicked") },
        //     { label: "Save", click: () => console.log("Save clicked") },
        //     { type: "separator" },
        //     { label: "Exit", role: "quit" },
        // ],
    },
    {
        label: "HR",
        submenu: [
            { label: "Police", role: "hr" },
        ],
    },
    {label:"Leave"},
    {
        label: "Attendance",
        submenu: [
            { label: "Today Attendance", click: () => console.log("Open clicked") },
            { label: "Monthly Attendance", click: () => console.log("Save clicked") },
        ],
    },
    {
        label: "View",
        submenu: [
            { label: "Reload", role: "reload" },
            { label: "Toggle Full Screen", role: "togglefullscreen" },
            {
                label: "Toggle Developer Tools",
                role: "toggleDevTools",
              },
        ],
    },
    {
        label: "Help",
        submenu: [
            { label: "About", click: () => console.log("About clicked") },
        ],
    },
];

const appMenu = Menu.buildFromTemplate(menuTemplate);

module.exports = appMenu;
