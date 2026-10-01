// BLOODSWORN — shared by every page: where the server lives, and the login token.
//
// EDIT THIS when you deploy: your Render server's hostname (no protocol, no
// trailing slash). Pages opened from localhost (or as files) use a local
// server on port 8080 instead.
const DEPLOYED_SERVER_HOST = "court-clash.onrender.com";

const SERVER = (() => {
    const local = ['localhost', '127.0.0.1', ''].includes(location.hostname);
    const host = local ? 'localhost:8080' : DEPLOYED_SERVER_HOST;
    const secure = !local && location.protocol === 'https:';
    return { ws: (secure ? 'wss://' : 'ws://') + host, api: (secure ? 'https://' : 'http://') + host };
})();

// The session token from signup/login. It identifies this browser's player to
// the server; logging out deletes it on both sides.
const TOKEN_KEY = 'bloodsworn.token';
function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(token) {
    try {
        if (token)
            localStorage.setItem(TOKEN_KEY, token);
        else
            localStorage.removeItem(TOKEN_KEY);
    }
    catch { }
}
