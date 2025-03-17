const Store = require("electron-store");
const store = new Store();

module.exports = {
    setTokens: (token, refreshToken, Username,Usershift,User_id,user_time_zone,isloggedIn) => {
        store.set("userSession", { 
            isloggedIn:isloggedIn,
            accessToken: token, 
            refreshToken: refreshToken, 
            name: Username, 
            shift:Usershift, 
            user_id: User_id,
            user_time_zone:user_time_zone
        });
    },
    setLoginActivity: (activity)=>{
        store.set('app_last_activity',{
            last_activity:activity?activity:1
        });
    },
    getTokens: () => store.get("userSession"),
    getLoginActivity: () => store.get("app_last_activity"),
    clearTokens: () => store.delete("userSession"),
    clearActivitiy: () => store.delete("app_last_activity"),
};
