/**
 * ╔══════════════════════════════════════════════════╗
 * ║   CATTAGRAM — SillyTavern Extension v1.0         ║
 * ║   Floating window + User/Bot accounts            ║
 * ║   Bridges ST API key & jailbreak injection       ║
 * ╚══════════════════════════════════════════════════╝
 */

import { setExtensionPrompt, extension_prompt_types } from "../../../../script.js";

(function () {
    "use strict";

    /* ══════════════════════════════════════════════
       CONSTANTS
    ══════════════════════════════════════════════ */
    const EXT_ID      = "cattagram";
    const WIN_ID      = "cattagram-window";
    const BTN_ID      = "cattagram-toggle-btn";
    const FRAME_ID    = "cattagram-frame";
    const LS_OPEN     = "cg_win_open";
    const LS_POS      = "cg_win_pos";
    const LS_SIZE     = "cg_win_size";
    const PROMPT_ID   = "cattagram_jb";

    /* ══════════════════════════════════════════════
       WAIT FOR DOM & jQuery
    ══════════════════════════════════════════════ */
    function waitReady(cb) {
        if (window.jQuery && document.body) { cb(); return; }
        const iv = setInterval(() => {
            if (window.jQuery && document.body) { clearInterval(iv); cb(); }
        }, 300);
    }

    /* ══════════════════════════════════════════════
       BUILD FLOATING TOGGLE BUTTON
    ══════════════════════════════════════════════ */
    function buildToggleBtn() {
        if (document.getElementById(BTN_ID)) return;
        const btn = document.createElement("button");
        btn.id = BTN_ID;
        btn.innerHTML = `🐾<span class="notif-dot"></span>`;
        btn.title = "Cattagram";
        document.body.appendChild(btn);
        btn.addEventListener("click", toggleWindow);
    }

    /* ══════════════════════════════════════════════
       BUILD FLOATING WINDOW
    ══════════════════════════════════════════════ */
    function buildWindow() {
        if (document.getElementById(WIN_ID)) return;

        const win = document.createElement("div");
        win.id = WIN_ID;
        win.innerHTML = `
            <div id="cattagram-drag-handle"></div>
            <div id="cattagram-titlebar">
                <div class="cg-wdots">
                    <button class="cg-wdot cg-dot-close" title="ปิด" id="cg-btn-close"></button>
                    <button class="cg-wdot cg-dot-min"   title="ย่อ"  id="cg-btn-min"></button>
                    <button class="cg-wdot cg-dot-max"   title="ขยาย" id="cg-btn-max"></button>
                </div>
                <span style="font-size:11px;color:rgba(255,255,255,0.4);pointer-events:none;font-family:Kanit,sans-serif;">Cattagram</span>
                <div style="width:54px;"></div>
            </div>
            <iframe id="${FRAME_ID}" allowtransparency="true" scrolling="no"></iframe>
            <div id="cattagram-resize"></div>
            <div id="cattagram-resize-corner"></div>
        `;
        document.body.appendChild(win);

        // Restore position/size
        const savedPos  = safeJSON(localStorage.getItem(LS_POS));
        const savedSize = safeJSON(localStorage.getItem(LS_SIZE));
        if (savedPos) {
            win.style.right  = "auto";
            win.style.bottom = "auto";
            win.style.left   = savedPos.x + "px";
            win.style.top    = savedPos.y + "px";
        }
        if (savedSize) {
            win.style.width  = savedSize.w + "px";
            win.style.height = savedSize.h + "px";
        }

        // Wire close/min/max
        document.getElementById("cg-btn-close").addEventListener("click", () => closeWindow());
        document.getElementById("cg-btn-min").addEventListener("click",   () => minWindow());
        document.getElementById("cg-btn-max").addEventListener("click",   () => maxWindow());

        makeDraggable(win, document.getElementById("cattagram-drag-handle"));
        makeResizable(win,
            document.getElementById("cattagram-resize"),
            document.getElementById("cattagram-resize-corner")
        );

        loadFrame();
    }

    /* ══════════════════════════════════════════════
       INJECT APP HTML INTO IFRAME
       (self-contained, no external server needed)
    ══════════════════════════════════════════════ */
    function loadFrame() {
        const frame = document.getElementById(FRAME_ID);
        if (!frame) return;

        // Read ST config to pass to app
        const stCfg = getSTConfig();

        const appHTML = buildAppHTML(stCfg);
        frame.srcdoc = appHTML;

        // Message bridge: app → ST
        window.removeEventListener("message", onFrameMessage);
        window.addEventListener("message", onFrameMessage);
    }

    /* ══════════════════════════════════════════════
       MESSAGE BRIDGE  (iframe ↔ ST)
    ══════════════════════════════════════════════ */
    function onFrameMessage(ev) {
        const d = ev.data;
        if (!d || d.source !== "cattagram-app") return;

        switch (d.type) {
            case "GET_ST_CONFIG":
                sendToFrame({ type: "ST_CONFIG", payload: getSTConfig() });
                break;
            case "SET_JAILBREAK":
                applyJailbreak(d.payload);
                break;
            case "CLEAR_JAILBREAK":
                clearJailbreak();
                break;
            case "TOAST":
                showExtToast(d.payload || "");
                break;
            case "SAVE_LS":
                try { localStorage.setItem("cg_app_" + d.key, d.value); } catch {}
                break;
            case "LOAD_LS":
                const val = localStorage.getItem("cg_app_" + d.key);
                sendToFrame({ type: "LS_VALUE", key: d.key, value: val });
                break;
        }
    }

    function sendToFrame(obj) {
        const frame = document.getElementById(FRAME_ID);
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage(obj, "*");
        }
    }

    /* ══════════════════════════════════════════════
       READ SILLYTAVERN CONFIG
    ══════════════════════════════════════════════ */
    function getSTConfig() {
        const cfg = {
            apiUrl: "",
            apiKey: "",
            model:  "",
            source: "unknown"
        };

        try {
            // Try SillyTavern's global power_user / oai_settings objects
            const pu  = window.power_user  || {};
            const oai = window.oai_settings || {};
            const ext = window.extension_settings || {};

            // API URL — check multiple known ST globals
            const candidates = [
                oai.openai_reverse_proxy,
                pu.proxy_url,
                window.main_api_url,
                window.ST_API_URL,
                (ext.connectionManager || {}).api_url,
            ];
            for (const c of candidates) {
                if (typeof c === "string" && c.trim()) { cfg.apiUrl = c.trim(); break; }
            }

            // API Key
            const keyCandidates = [
                oai.api_key_openai,
                pu.proxy_password,
                window.ST_API_KEY,
            ];
            for (const k of keyCandidates) {
                if (typeof k === "string" && k.trim()) { cfg.apiKey = k.trim(); break; }
            }

            // Model
            cfg.model = oai.openai_model || pu.model || "";

            // Source label
            cfg.source = window.main_api || "openai";

            // Also try reading from ST's DOM inputs directly (most reliable)
            const urlInput = document.querySelector(
                '#openai_reverse_proxy, #proxy_password_entry, [name="api_url_text"]'
            );
            const keyInput = document.querySelector(
                '#api_key_openai, #api_key_claude, #api_key_novel'
            );
            if (urlInput && urlInput.value) cfg.apiUrl = urlInput.value.trim();
            if (keyInput && keyInput.value) cfg.apiKey = keyInput.value.trim();

        } catch (e) {
            console.warn("[Cattagram] Could not read ST config:", e);
        }

        return cfg;
    }

    /* ══════════════════════════════════════════════
       JAILBREAK / SYSTEM PROMPT INJECTION
    ══════════════════════════════════════════════ */
    function applyJailbreak(text) {
        if (!text || !text.trim()) return;
        try {
            if (typeof setExtensionPrompt === "function") {
                setExtensionPrompt(PROMPT_ID, text, extension_prompt_types.IN_PROMPT, 1);
                console.log("[Cattagram] Jailbreak injected ✓");
                showExtToast("💉 ใส่ Jailbreak แล้ว ✓");
            }
        } catch (e) {
            console.error("[Cattagram] JB inject error:", e);
        }
    }

    function clearJailbreak() {
        try {
            if (typeof setExtensionPrompt === "function") {
                setExtensionPrompt(PROMPT_ID, "");
                console.log("[Cattagram] Jailbreak cleared");
                showExtToast("🔒 ลบ Jailbreak แล้ว");
            }
        } catch (e) {}
    }

    /* ══════════════════════════════════════════════
       WINDOW CONTROLS
    ══════════════════════════════════════════════ */
    function openWindow() {
        const win = document.getElementById(WIN_ID);
        if (!win) { buildWindow(); }
        requestAnimationFrame(() => {
            document.getElementById(WIN_ID)?.classList.add("cg-open");
        });
        localStorage.setItem(LS_OPEN, "1");
    }

    function closeWindow() {
        document.getElementById(WIN_ID)?.classList.remove("cg-open");
        localStorage.setItem(LS_OPEN, "0");
    }

    let _minimized = false;
    function minWindow() {
        const win = document.getElementById(WIN_ID);
        if (!win) return;
        if (_minimized) {
            win.style.height = (safeJSON(localStorage.getItem(LS_SIZE))?.h || 720) + "px";
            _minimized = false;
        } else {
            win.style.height = "48px";
            _minimized = true;
        }
    }

    let _maximized = false;
    let _prevStyle  = {};
    function maxWindow() {
        const win = document.getElementById(WIN_ID);
        if (!win) return;
        if (_maximized) {
            Object.assign(win.style, _prevStyle);
            _maximized = false;
        } else {
            _prevStyle = { width: win.style.width, height: win.style.height, top: win.style.top, left: win.style.left, right: win.style.right, bottom: win.style.bottom };
            win.style.left = "0"; win.style.top = "0";
            win.style.right = "0"; win.style.bottom = "0";
            win.style.width = "100vw"; win.style.height = "100vh";
            win.style.borderRadius = "0";
            _maximized = true;
        }
    }

    function toggleWindow() {
        const win = document.getElementById(WIN_ID);
        if (!win) { buildWindow(); openWindow(); return; }
        if (win.classList.contains("cg-open")) {
            closeWindow();
        } else {
            openWindow();
            // Re-sync ST config when user opens window
            sendToFrame({ type: "ST_CONFIG", payload: getSTConfig() });
        }
    }

    /* ══════════════════════════════════════════════
       DRAG
    ══════════════════════════════════════════════ */
    function makeDraggable(el, handle) {
        let ox = 0, oy = 0, startX = 0, startY = 0, dragging = false;
        handle.addEventListener("mousedown", e => {
            dragging = true;
            startX = e.clientX; startY = e.clientY;
            const r = el.getBoundingClientRect();
            ox = r.left; oy = r.top;
            el.style.right = "auto"; el.style.bottom = "auto";
            document.body.style.userSelect = "none";
        });
        document.addEventListener("mousemove", e => {
            if (!dragging) return;
            const nx = ox + (e.clientX - startX);
            const ny = oy + (e.clientY - startY);
            el.style.left = Math.max(0, nx) + "px";
            el.style.top  = Math.max(0, ny) + "px";
        });
        document.addEventListener("mouseup", () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.userSelect = "";
            const r = el.getBoundingClientRect();
            localStorage.setItem(LS_POS, JSON.stringify({ x: r.left, y: r.top }));
        });
    }

    /* ══════════════════════════════════════════════
       RESIZE
    ══════════════════════════════════════════════ */
    function makeResizable(el, bottomHandle, cornerHandle) {
        function attachResize(handle, mode) {
            let startY, startX, startH, startW;
            handle.addEventListener("mousedown", e => {
                e.preventDefault();
                startY = e.clientY; startX = e.clientX;
                startH = el.offsetHeight; startW = el.offsetWidth;
                document.body.style.userSelect = "none";
                function onMove(ev) {
                    if (mode === "s" || mode === "sw") {
                        const newH = Math.max(400, startH + (ev.clientY - startY));
                        el.style.height = newH + "px";
                    }
                    if (mode === "sw") {
                        const newW = Math.max(300, startW - (ev.clientX - startX));
                        el.style.width = newW + "px";
                    }
                }
                function onUp() {
                    document.body.style.userSelect = "";
                    document.removeEventListener("mousemove", onMove);
                    document.removeEventListener("mouseup", onUp);
                    localStorage.setItem(LS_SIZE, JSON.stringify({ w: el.offsetWidth, h: el.offsetHeight }));
                }
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
            });
        }
        attachResize(bottomHandle, "s");
        attachResize(cornerHandle, "sw");
    }

    /* ══════════════════════════════════════════════
       TOAST (outside iframe)
    ══════════════════════════════════════════════ */
    function showExtToast(msg) {
        if (window.toastr) { window.toastr.info(msg, "Cattagram"); return; }
        let t = document.getElementById("cg-ext-toast");
        if (!t) {
            t = document.createElement("div");
            t.id = "cg-ext-toast";
            Object.assign(t.style, {
                position:"fixed", bottom:"88px", left:"50%", transform:"translateX(-50%)",
                background:"rgba(20,20,20,0.92)", color:"#fff", padding:"9px 18px",
                borderRadius:"12px", fontSize:"13px", fontWeight:"600",
                zIndex:"99999", opacity:"0", pointerEvents:"none",
                transition:"opacity 0.25s", fontFamily:"Kanit,sans-serif", whiteSpace:"nowrap"
            });
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.opacity = "1";
        clearTimeout(t._timer);
        t._timer = setTimeout(() => { t.style.opacity = "0"; }, 2500);
    }

    /* ══════════════════════════════════════════════
       HELPERS
    ══════════════════════════════════════════════ */
    function safeJSON(str) {
        try { return str ? JSON.parse(str) : null; } catch { return null; }
    }

    // Collect all localStorage keys for the app (to pass into iframe on load)
    function collectAppStorage() {
        const data = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && (k.startsWith("cg_app_") || k.startsWith("cattagram_"))) {
                    data[k] = localStorage.getItem(k);
                }
            }
        } catch {}
        return data;
    }

    /* ══════════════════════════════════════════════
       BUILD FULL APP HTML (self-contained srcdoc)
    ══════════════════════════════════════════════ */
    function buildAppHTML(stCfg) {
        const appStorage = JSON.stringify(collectAppStorage());
        const stCfgJSON  = JSON.stringify(stCfg);

        return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Cattagram</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&display=swap"/>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
::-webkit-scrollbar{display:none;}
html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#080808;font-family:'Kanit',sans-serif;}
input,textarea,button,select{font-family:'Kanit',sans-serif;}
</style>
</head>
<body>
<div id="cg-root"></div>
<script>
/* ─── Bridge: restore localStorage from ST parent ─── */
const _savedStorage = ${appStorage};
for(const [k,v] of Object.entries(_savedStorage)){
  try{ localStorage.setItem(k,v); }catch{}
}

/* ─── ST Config passed from parent ─── */
window.__ST_CFG__ = ${stCfgJSON};

/* ─── postMessage bridge to ST parent ─── */
window.cgBridge = {
  send(type, payload, extra){
    window.parent.postMessage({source:"cattagram-app", type, payload, ...extra}, "*");
  },
  saveLS(key, value){ this.send("SAVE_LS", null, {key, value}); },
  loadLS(key){ this.send("LOAD_LS", null, {key}); },
  toast(msg){ this.send("TOAST", msg); },
  setJB(text){ this.send("SET_JAILBREAK", text); },
  clearJB(){ this.send("CLEAR_JAILBREAK"); },
  getSTConfig(){ this.send("GET_ST_CONFIG"); },
};

/* ─── Listen for replies from ST ─── */
window.addEventListener("message", function(ev){
  const d = ev.data;
  if(!d) return;
  if(d.type === "ST_CONFIG" && window.__onSTConfig) window.__onSTConfig(d.payload);
  if(d.type === "LS_VALUE"  && window.__onLSValue)  window.__onLSValue(d.key, d.value);
});

/* ════════════════════════════════════════════════════
   MINI STORAGE (localStorage wrapper)
════════════════════════════════════════════════════ */
const LS = {
  get(k,fb){ try{ const v=localStorage.getItem("cg_app_"+k); return v?JSON.parse(v):fb; }catch{ return fb; } },
  set(k,v){ try{ const s=JSON.stringify(v); localStorage.setItem("cg_app_"+k,s); cgBridge.saveLS(k,s); }catch{} },
};

/* ════════════════════════════════════════════════════
   THEME
════════════════════════════════════════════════════ */
const ACCENTS = {
  orange:{p:"#FF6B35",s:"#FF9A5C",bl:"#FFE4D6",g:"linear-gradient(135deg,#FF6B35,#FF4081)",lb:"ส้มแมว 🐾"},
  sky:   {p:"#007AFF",s:"#5AC8FA",bl:"#D6EAFF",g:"linear-gradient(135deg,#007AFF,#AF52DE)",lb:"ฟ้าใส 🌊"},
  sage:  {p:"#00C896",s:"#5AC8FA",bl:"#D6F5E3",g:"linear-gradient(135deg,#00C896,#5AC8FA)",lb:"มิ้นท์ 🌿"},
  grape: {p:"#AF52DE",s:"#DA8FFF",bl:"#F0D6FF",g:"linear-gradient(135deg,#AF52DE,#FF2D55)",lb:"ม่วง 🔮"},
  rose:  {p:"#FF2D55",s:"#FF6B6B",bl:"#FFD6DF",g:"linear-gradient(135deg,#FF2D55,#FF9500)",lb:"กุหลาบ 🌹"},
  neon:  {p:"#00FFB3",s:"#00D4FF",bl:"#001a15",g:"linear-gradient(135deg,#00FFB3,#00D4FF)",lb:"นีออน ⚡"},
};

function makeTheme(dark, ak){
  const a = ACCENTS[ak]||ACCENTS.orange;
  return dark ? {
    bg:"#080808",surface:"#111111",card:"#1A1A1A",elevated:"#242424",
    p:a.p,s:a.s,bl:ak==="neon"?"#001a15":"#1e1220",g:a.g,
    text:"#FFFFFF",sub:"rgba(255,255,255,0.8)",muted:"rgba(255,255,255,0.45)",
    border:"rgba(255,255,255,0.08)",sep:"rgba(255,255,255,0.06)",bubble:"#1C1C1C",
    dark:true,ak,
  } : {
    bg:"#F0F0F5",surface:"#FFFFFF",card:"#FFFFFF",elevated:"#F0F0F5",
    p:a.p,s:a.s,bl:a.bl,g:a.g,
    text:"#0A0A0A",sub:"rgba(0,0,0,0.7)",muted:"rgba(0,0,0,0.4)",
    border:"rgba(0,0,0,0.08)",sep:"rgba(0,0,0,0.05)",bubble:"#F0F0F5",
    dark:false,ak,
  };
}

function rgb(h){ if(!h||h[0]!=="#")return"0,0,0"; return parseInt(h.slice(1,3),16)+","+parseInt(h.slice(3,5),16)+","+parseInt(h.slice(5,7),16); }

/* ════════════════════════════════════════════════════
   STATE
════════════════════════════════════════════════════ */
const S = {
  dark:      LS.get("dark", true),
  ak:        LS.get("ak", "orange"),
  screen:    "home",
  prevScreen:"home",
  myProfile: LS.get("myProfile", {name:"ฉัน",username:"me",avatar:"😺",avatarImg:null,bio:""}),
  chars:     LS.get("chars", [{
    id:"c1",name:"jokerxrun",displayName:"Joker Arun",avatar:"🐱",avatarImg:null,
    bio:"🔧 วิศวะ ปี 3 | 🏎️ รักความเร็ว",online:true,verified:false,
    apiUrl:"",apiKey:"",
    systemPrompt:"คุณคือ Joker Arun วิศวะปี 3 ที่ชอบรถและเพลง ตอบภาษาไทยแบบเพื่อนสนิท ไม่เป็นทางการ สั้นกระชับ",
    charCard:"",
  }]),
  config:    LS.get("config", {
    apiUrl: window.__ST_CFG__?.apiUrl || "",
    apiKey: window.__ST_CFG__?.apiKey || "",
    jailbreak: "",
    jbActive: false,
    useSTConfig: true,
  }),
  dmContact: null,
  chatInputs: {},
  chatHistory: {},   // keyed by char id
  showToast: { msg:"", show:false },
  _toastTimer: null,
};

// If ST config available, auto-fill
if(window.__ST_CFG__?.apiUrl && !S.config.apiUrl){
  S.config.apiUrl = window.__ST_CFG__.apiUrl;
  S.config.apiKey = window.__ST_CFG__.apiKey || "";
}

function getT(){ return makeTheme(S.dark, S.ak); }

/* ════════════════════════════════════════════════════
   AI CALL
════════════════════════════════════════════════════ */
async function callAI({apiUrl, apiKey, systemPrompt, charCard, history, userText}){
  const base = (apiUrl||"").replace(/\\/$/,"");
  if(!base) throw new Error("ไม่ได้ตั้งค่า API URL");
  const headers = {"Content-Type":"application/json"};
  if(apiKey) headers["Authorization"] = "Bearer "+apiKey;

  let sys = systemPrompt || "คุณคือผู้ช่วยที่ตอบภาษาไทย";
  if(charCard) sys = charCard+"\\n\\n---\\n"+sys;

  // Inject active jailbreak
  if(S.config.jbActive && S.config.jailbreak){
    sys = S.config.jailbreak+"\\n\\n---\\n"+sys;
  }

  const messages = [{role:"system",content:sys}, ...history, {role:"user",content:userText}];
  const res = await fetch(base+"/v1/chat/completions",{
    method:"POST", headers,
    body: JSON.stringify({model:"default",messages,max_tokens:500,stream:false}),
    signal: AbortSignal.timeout(30000),
  });
  if(!res.ok){const t=await res.text().catch(()=>"");throw new Error("HTTP "+res.status+(t?": "+t.slice(0,80):""));}
  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || data.response || "";
  if(!reply.trim()) throw new Error("ได้รับข้อความว่างจาก API");
  return reply.trim();
}

/* ════════════════════════════════════════════════════
   TOAST
════════════════════════════════════════════════════ */
function showToast(msg){
  S.showToast = {msg, show:true};
  clearTimeout(S._toastTimer);
  S._toastTimer = setTimeout(()=>{ S.showToast.show=false; renderApp(); }, 2500);
  renderApp();
}

/* ════════════════════════════════════════════════════
   RENDER ENGINE (vanilla DOM diffing-lite)
════════════════════════════════════════════════════ */
let _raf = false;
function renderApp(){
  if(_raf) return;
  _raf=true;
  requestAnimationFrame(()=>{ _raf=false; _doRender(); });
}

function _doRender(){
  const root = document.getElementById("cg-root");
  if(!root) return;
  const T = getT();
  root.style.cssText = "width:100%;height:100vh;overflow:hidden;background:"+T.bg+";color:"+T.text+";position:relative;";
  root.innerHTML = buildScreen(T);
  attachEvents(T);
}

/* ════════════════════════════════════════════════════
   SCREEN ROUTER
════════════════════════════════════════════════════ */
function buildScreen(T){
  const screens = {
    home:       buildHomeScreen,
    chars:      buildCharsScreen,
    dm:         buildDMListScreen,
    dm_chat:    buildDMChatScreen,
    profile:    buildProfileScreen,
    settings:   buildSettingsScreen,
    char_edit:  buildCharEditScreen,
    st_connect: buildSTConnectScreen,
  };
  const fn = screens[S.screen] || screens.home;
  const content = fn(T);
  const toast   = buildToast(T);
  const bottomNav = (S.screen!=="dm_chat" && S.screen!=="char_edit" && S.screen!=="st_connect") ? buildBottomNav(T) : "";
  return content + toast + bottomNav;
}

/* ── TOAST HTML ── */
function buildToast(T){
  return \`<div style="position:fixed;bottom:88px;left:50%;transform:translateX(-50%) translateY(\${S.showToast.show?0:10}px);
    background:rgba(20,20,20,0.92);backdrop-filter:blur(20px);color:#fff;
    padding:10px 20px;border-radius:14px;font-size:13px;font-weight:500;
    z-index:300;opacity:\${S.showToast.show?1:0};transition:all .25s;
    pointer-events:none;white-space:nowrap;">\${esc(S.showToast.msg)}</div>\`;
}

/* ── BOTTOM NAV ── */
function buildBottomNav(T){
  const items=[
    {id:"home",   icon:"🏠", label:"หน้าแรก"},
    {id:"chars",  icon:"🐾", label:"ตัวละคร"},
    {id:"",       special:true},
    {id:"dm",     icon:"💬", label:"ข้อความ"},
    {id:"profile",icon:"👤", label:"โปรไฟล์"},
  ];
  const tabs = items.map(n=>{
    if(n.special) return \`<button data-nav="create" style="background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;">
      <div style="width:44px;height:44px;border-radius:14px;background:\${T.g};display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(\${rgb(T.p)},.45);transform:translateY(-4px);">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/></svg>
      </div></button>\`;
    const active = S.screen===n.id;
    return \`<button data-nav="\${n.id}" style="background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 10px;min-width:46px;">
      <span style="font-size:20px;transition:transform .15s;transform:\${active?"scale(1.15)":"scale(1)"};color:\${active?T.p:T.muted};">\${n.icon}</span>
      <span style="font-size:9px;font-weight:\${active?700:500};color:\${active?T.p:T.muted};font-family:'Kanit',sans-serif;">\${n.label}</span>
    </button>\`;
  }).join("");
  return \`<div style="position:fixed;bottom:0;left:0;right:0;background:\${T.dark?"rgba(8,8,8,0.92)":"rgba(240,240,245,0.94)"};
    backdrop-filter:saturate(200%) blur(24px);border-top:0.5px solid \${T.sep};
    display:flex;justify-content:space-around;align-items:center;padding:8px 4px 18px;z-index:50;">\${tabs}</div>\`;
}

/* ── TOP BAR ── */
function topBar(T, title, {onBack=false, right="", logo=false}={}){
  const backBtn = onBack ? \`<button data-action="back" style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;color:\${T.p};padding:4px 0;flex-shrink:0;">
    <svg width="9" height="16" viewBox="0 0 11 18" fill="none"><path d="M9 2L2 9L9 16" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span style="font-size:16px;font-weight:500;font-family:'Kanit',sans-serif;color:\${T.p};">กลับ</span></button>\` : "";
  const titleEl = logo
    ? \`<div style="display:flex;align-items:center;gap:8px;"><div style="width:28px;height:28px;border-radius:9px;background:\${T.g};display:flex;align-items:center;justify-content:center;font-size:14px;">🐾</div><span style="font-size:20px;font-weight:900;color:\${T.p};letter-spacing:-0.5px;font-family:'Kanit',sans-serif;">Cattagram</span></div>\`
    : \`<span style="font-size:16px;font-weight:700;font-family:'Kanit',sans-serif;">\${title}</span>\`;
  return \`<div style="position:sticky;top:0;z-index:30;background:\${T.dark?"rgba(8,8,8,0.88)":"rgba(240,240,245,0.92)"};
    backdrop-filter:saturate(200%) blur(24px);border-bottom:0.5px solid \${T.sep};
    padding:12px 14px 10px;display:flex;align-items:center;gap:8px;">
    \${backBtn}<div style="flex:1;">\${titleEl}</div><div>\${right}</div></div>\`;
}

/* ════════════════════════════════════════════════════
   HOME SCREEN
════════════════════════════════════════════════════ */
function buildHomeScreen(T){
  const stConnected = !!(S.config.apiUrl);
  const stories = S.chars.slice(0,8).map(c=>\`
    <div style="display:flex;flex-direction:column;align-items:center;gap:5px;flex-shrink:0;cursor:pointer;" data-nav="dm">
      <div style="width:62px;height:62px;border-radius:50%;background:\${T.g};padding:2.5px;">
        <div style="width:100%;height:100%;border-radius:50%;background:\${T.dark?T.elevated:T.bl};display:flex;align-items:center;justify-content:center;font-size:26px;overflow:hidden;border:2px solid \${T.bg};">
          \${c.avatarImg?\`<img src="\${c.avatarImg}" style="width:100%;height:100%;object-fit:cover;"/>\`:c.avatar}
        </div>
      </div>
      <span style="font-size:10px;font-weight:600;color:\${T.sub};max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'Kanit',sans-serif;">\${esc(c.name)}</span>
    </div>\`).join("");

  const posts = S.chars.slice().reverse().map((c,i)=>{
    const imgs = ["https://placekitten.com/400/"+(300+i*17)];
    return \`<div style="background:\${T.card};margin-bottom:12px;border-radius:18px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.12);">
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;">
        <div style="width:38px;height:38px;border-radius:50%;background:\${T.dark?T.elevated:T.bl};display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden;flex-shrink:0;">
          \${c.avatarImg?\`<img src="\${c.avatarImg}" style="width:100%;height:100%;object-fit:cover;"/>\`:c.avatar}
        </div>
        <div style="flex:1;"><div style="font-size:14px;font-weight:700;">\${esc(c.name)}\${c.verified?\` <span style="color:\${T.p};font-size:12px;">✓</span>``:""}</div>
        <div style="font-size:11px;color:\${T.muted};">\${c.online?"🟢 ออนไลน์":"🔴 ออฟไลน์"}</div></div>
        <span style="font-size:18px;cursor:pointer;">•••</span>
      </div>
      <div style="width:100%;aspect-ratio:1;background:\${T.elevated};overflow:hidden;">
        <img src="\${imgs[0]}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"/>
      </div>
      <div style="padding:12px 14px;">
        <div style="display:flex;gap:16px;margin-bottom:10px;">
          <span style="font-size:22px;cursor:pointer;">🤍</span>
          <span style="font-size:22px;cursor:pointer;">💬</span>
          <span style="font-size:22px;cursor:pointer;">📤</span>
        </div>
        <div style="font-size:13px;"><span style="font-weight:700;">\${esc(c.name)}</span> <span style="color:\${T.sub};">\${esc(c.bio||"สวัสดี! 🐾")}</span></div>
      </div>
    </div>\`;
  }).join("");

  const stBanner = !stConnected ? \`<div data-action="go-stconnect" style="margin:0 14px 14px;background:linear-gradient(135deg,rgba(255,107,53,.15),rgba(175,82,222,.15));border:1px solid \${T.p}44;border-radius:16px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;">
    <span style="font-size:24px;">🔗</span>
    <div><div style="font-size:14px;font-weight:700;color:\${T.p};">เชื่อม SillyTavern</div>
    <div style="font-size:12px;color:\${T.muted};">แตะเพื่อตั้งค่า API</div></div>
    <span style="margin-left:auto;color:\${T.muted};font-size:16px;">›</span>
  </div>\` : \`<div style="margin:0 14px 14px;background:rgba(48,209,88,.08);border-radius:16px;padding:10px 14px;display:flex;align-items:center;gap:8px;">
    <span style="font-size:16px;">🟢</span><span style="font-size:12px;font-weight:600;color:#30D158;">SillyTavern เชื่อมต่อแล้ว</span>
    <span style="font-size:11px;color:\${T.muted};margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;">\${esc(S.config.apiUrl)}</span>
  </div>\`;

  return \`<div style="background:\${T.bg};min-height:100vh;padding-bottom:80px;overflow-y:auto;height:100vh;">
    \${topBar(T,"",{logo:true, right:\`<button data-action="go-stconnect" style="background:\${T.dark?T.elevated:"rgba(0,0,0,0.08)"};border:none;border-radius:99px;padding:6px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;">
      <span style="font-size:14px;">🔗</span><span style="font-size:12px;font-weight:700;color:\${T.p};font-family:'Kanit',sans-serif;">ST</span></button>\`})}
    \${stBanner}
    <div style="overflow-x:auto;display:flex;gap:14px;padding:4px 14px 16px;scrollbar-width:none;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:5px;flex-shrink:0;cursor:pointer;" data-nav="create">
        <div style="width:62px;height:62px;border-radius:50%;background:\${T.g};display:flex;align-items:center;justify-content:center;">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4v14M4 11h14" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>
        </div>
        <span style="font-size:10px;font-weight:600;color:\${T.sub};font-family:'Kanit',sans-serif;">สร้าง</span>
      </div>
      \${stories}
    </div>
    <div style="padding:0 10px;">\${posts || \`<div style="text-align:center;padding:40px;color:\${T.muted};font-size:14px;">🐾 เพิ่มตัวละครเพื่อเห็นโพสต์</div>\`}</div>
  </div>\`;
}

/* ════════════════════════════════════════════════════
   CHARACTERS SCREEN
════════════════════════════════════════════════════ */
function buildCharsScreen(T){
  const list = S.chars.map((c,i)=>{
    const hasApi = !!(c.apiUrl||S.config.apiUrl);
    return \`<div style="display:flex;align-items:center;gap:12px;padding:13px 14px;">
      <div style="width:50px;height:50px;border-radius:50%;background:\${T.dark?T.elevated:T.bl};display:flex;align-items:center;justify-content:center;font-size:22px;overflow:hidden;flex-shrink:0;position:relative;">
        \${c.avatarImg?\`<img src="\${c.avatarImg}" style="width:100%;height:100%;object-fit:cover;"/>\`:c.avatar}
        \${c.online?\`<div style="position:absolute;bottom:1px;right:1px;width:11px;height:11px;border-radius:50%;background:#30D158;border:2px solid \${T.bg};"></div>\`:""}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;">
          <span style="font-size:14px;font-weight:700;">\${esc(c.name)}</span>
          \${c.verified?\`<span style="font-size:11px;color:\${T.p};">✓</span>`:""}\`}
          <div style="margin-left:auto;background:\${hasApi?"rgba(48,209,88,0.12)":T.elevated};border-radius:99px;padding:2px 8px;">
            <span style="font-size:10px;font-weight:700;color:\${hasApi?"#30D158":T.muted};">\${hasApi?"AI พร้อม":"ไม่มี API"}</span>
          </div>
        </div>
        <span style="font-size:11px;color:\${T.muted};display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${esc(c.bio||"ไม่มี bio")}</span>
      </div>
      <div style="display:flex;gap:5px;">
        <button data-edit-char="\${c.id}" style="background:\${T.dark?T.elevated:T.bl};border:none;border-radius:9px;padding:6px 12px;cursor:pointer;color:\${T.p};font-size:12px;font-weight:600;font-family:'Kanit',sans-serif;">แก้ไข</button>
        <button data-del-char="\${c.id}" style="background:rgba(255,59,48,0.1);border:none;border-radius:9px;padding:6px 9px;cursor:pointer;font-size:13px;">🗑️</button>
      </div>
    </div>\${i<S.chars.length-1?\`<div style="height:0.5px;background:\${T.sep};margin-left:76px;"></div>\`:""}`;
  }).join("");

  return \`<div style="background:\${T.bg};min-height:100vh;padding-bottom:80px;overflow-y:auto;height:100vh;">
    \${topBar(T,"ตัวละคร",{right:\`<button data-action="new-char" style="background:\${T.g};border:none;border-radius:99px;padding:6px 14px;cursor:pointer;">
      <span style="font-size:12px;font-weight:700;color:#fff;font-family:'Kanit',sans-serif;">+ เพิ่ม</span></button>\`})}
    <div style="margin:14px;background:\${T.surface};border-radius:18px;overflow:hidden;border:0.5px solid \${T.border};">
      \${list || \`<div style="padding:40px;text-align:center;"><div style="font-size:48px;margin-bottom:12px;">🐾</div>
        <p style="color:\${T.muted};font-size:14px;">ยังไม่มีตัวละคร</p></div>\`}
    </div>
    <div style="margin:0 14px;background:\${T.surface};border-radius:14px;padding:12px 14px;border:0.5px solid \${T.border};">
      <div style="font-size:11px;font-weight:700;color:\${T.muted};margin-bottom:4px;text-transform:uppercase;">🔗 Global API</div>
      <div style="font-size:12px;color:\${T.p};word-break:break-all;">\${esc(S.config.apiUrl||"(ยังไม่ได้ตั้งค่า)")}</div>
    </div>
  </div>\`;
}

/* ════════════════════════════════════════════════════
   CHAR EDIT SCREEN
════════════════════════════════════════════════════ */
function buildCharEditScreen(T){
  const c = S._editingChar || {id:"__new__",name:"",displayName:"",avatar:"🐱",avatarImg:null,bio:"",online:true,verified:false,apiUrl:"",apiKey:"",systemPrompt:"",charCard:""};
  const isNew = c.id==="__new__";
  const EMOJIS=["🐱","🦊","🐻","💣","🧸","🐯","🦁","🐺","🐸","🐨","🦝","😺","🐰","🐼","🐧","🦄","🐉","👾","🤖","🧙","💀","👹","🐞","🦋"];

  const emojiBtns = EMOJIS.map(av=>\`<button data-set-av="\${av}" style="width:38px;height:38px;border-radius:50%;background:\${c.avatar===av&&!c.avatarImg?T.bl:T.dark?T.elevated:T.bg};
    border:\${c.avatar===av&&!c.avatarImg?\`2px solid \${T.p}`:\`1.5px solid \${T.border}`};
    cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">\${av}</button>\`).join("");

  const fieldSt = \`width:100%;background:\${T.dark?T.elevated:T.bg};border:0.5px solid \${T.border};border-radius:11px;padding:9px 12px;color:\${T.text};outline:none;box-sizing:border-box;font-family:'Kanit',sans-serif;font-size:13px;\`;

  return \`<div style="background:\${T.bg};min-height:100vh;padding-bottom:40px;overflow-y:auto;height:100vh;">
    \${topBar(T,isNew?"เพิ่มตัวละคร":"แก้ไขตัวละคร",{onBack:true, right:\`<button data-action="save-char" style="background:\${T.g};border:none;border-radius:99px;padding:7px 16px;cursor:pointer;">
      <span style="font-size:13px;font-weight:700;color:#fff;font-family:'Kanit',sans-serif;">บันทึก</span></button>\`})}
    <div style="padding:14px;">
      <!-- Avatar -->
      <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:18px;">
        <div data-action="pick-av-img" style="position:relative;width:80px;height:80px;cursor:pointer;margin-bottom:8px;">
          <div style="width:80px;height:80px;border-radius:50%;background:\${T.g};padding:2.5px;">
            <div style="width:100%;height:100%;border-radius:50%;background:\${T.dark?T.elevated:T.bl};display:flex;align-items:center;justify-content:center;font-size:32px;overflow:hidden;">
              \${c.avatarImg?\`<img src="\${c.avatarImg}" style="width:100%;height:100%;object-fit:cover;"/>\`:c.avatar}
            </div>
          </div>
          <div style="position:absolute;bottom:2px;right:2px;width:22px;height:22px;border-radius:50%;background:\${T.p};border:2px solid \${T.bg};display:flex;align-items:center;justify-content:center;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        </div>
        <input id="ce-av-file" type="file" accept="image/*" style="display:none;"/>
        <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:300px;">\${emojiBtns}</div>
      </div>

      <!-- Basic info -->
      <div style="background:\${T.surface};border-radius:14px;padding:14px;margin-bottom:12px;border:0.5px solid \${T.border};">
        <div style="font-size:12px;font-weight:800;margin-bottom:10px;">👤 ข้อมูลพื้นฐาน</div>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">Username *</label>
        <input id="ce-name" value="\${esc(c.name)}" placeholder="username" style="\${fieldSt}margin-bottom:10px;"/>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">ชื่อแสดง</label>
        <input id="ce-display" value="\${esc(c.displayName||"")}" placeholder="ชื่อแสดงผล" style="\${fieldSt}margin-bottom:10px;"/>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">Bio</label>
        <textarea id="ce-bio" rows="2" placeholder="bio..." style="\${fieldSt}resize:vertical;margin-bottom:10px;">\${esc(c.bio||"")}</textarea>
        <div style="display:flex;gap:20px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input id="ce-online" type="checkbox" \${c.online?"checked":""}/><span style="font-size:13px;font-weight:600;">ออนไลน์</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input id="ce-verified" type="checkbox" \${c.verified?"checked":""}/><span style="font-size:13px;font-weight:600;">✓ Verified</span>
          </label>
        </div>
      </div>

      <!-- AI config -->
      <div style="background:\${T.surface};border-radius:14px;padding:14px;margin-bottom:12px;border:0.5px solid \${T.border};">
        <div style="font-size:12px;font-weight:800;margin-bottom:10px;">🤖 AI / SillyTavern</div>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">API URL (ว่าง = ใช้ Global)</label>
        <input id="ce-apiurl" value="\${esc(c.apiUrl||"")}" placeholder="\${esc(S.config.apiUrl||"https://...")}" style="\${fieldSt}font-family:monospace;font-size:11px;margin-bottom:6px;"/>
        <div style="font-size:11px;color:\${T.muted};margin-bottom:10px;">Global: \${esc(S.config.apiUrl||"(ว่าง)")}</div>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">API Key (ถ้ามี)</label>
        <input id="ce-apikey" type="password" value="\${esc(c.apiKey||"")}" placeholder="sk-... หรือว่าง" style="\${fieldSt}margin-bottom:10px;"/>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">System Prompt</label>
        <textarea id="ce-sysprompt" rows="4" placeholder="คุณคือ ..." style="\${fieldSt}resize:vertical;margin-bottom:10px;">\${esc(c.systemPrompt||"")}</textarea>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">Character Card (YAML/JSON จาก ST)</label>
        <textarea id="ce-charcard" rows="5" placeholder="name: ...\\ndescription: ..." style="\${fieldSt}font-family:monospace;font-size:11px;resize:vertical;">\${esc(c.charCard||"")}</textarea>
        <div style="height:10px;"></div>
        <button id="ce-test-btn" style="width:100%;background:\${T.p};border:none;border-radius:12px;padding:11px;cursor:pointer;font-size:14px;font-weight:600;color:#fff;font-family:'Kanit',sans-serif;">🔌 ทดสอบเชื่อมต่อ</button>
        <div id="ce-test-result" style="margin-top:8px;"></div>
      </div>
    </div>
  </div>\`;
}

/* ════════════════════════════════════════════════════
   DM LIST
════════════════════════════════════════════════════ */
function buildDMListScreen(T){
  const list = S.chars.map((c,i)=>{
    const lastMsgs = LS.get("chat_"+c.id,[]);
    const last = lastMsgs[lastMsgs.length-1];
    const preview = last ? (last.role==="assistant"?c.name+": ":"")+last.content.slice(0,40)+(last.content.length>40?"...":"") : "แตะเพื่อเริ่มแชท";
    return \`<div data-open-dm="\${c.id}" style="display:flex;align-items:center;gap:12px;padding:13px 14px;cursor:pointer;">
      <div style="position:relative;flex-shrink:0;">
        <div style="width:50px;height:50px;border-radius:50%;background:\${T.dark?T.elevated:T.bl};display:flex;align-items:center;justify-content:center;font-size:22px;overflow:hidden;">
          \${c.avatarImg?\`<img src="\${c.avatarImg}" style="width:100%;height:100%;object-fit:cover;"/>\`:c.avatar}
        </div>
        \${c.online?\`<div style="position:absolute;bottom:1px;right:1px;width:11px;height:11px;border-radius:50%;background:#30D158;border:2px solid \${T.bg};"></div>\`:""}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:14px;font-weight:600;">\${esc(c.name)}\${c.verified?\` <span style="color:\${T.p};font-size:11px;">✓</span>``:""}</span>
          <span style="background:rgba(48,209,88,0.12);border-radius:99px;padding:2px 7px;font-size:10px;font-weight:700;color:#30D158;">AI</span>
        </div>
        <span style="font-size:12px;color:\${T.muted};display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${esc(preview)}</span>
      </div>
    </div>\${i<S.chars.length-1?\`<div style="height:0.5px;background:\${T.sep};margin-left:76px;"></div>\`:""}`;
  }).join("");

  return \`<div style="background:\${T.bg};min-height:100vh;padding-bottom:80px;overflow-y:auto;height:100vh;">
    \${topBar(T,"ข้อความ")}
    \${list || \`<div style="text-align:center;padding:60px 24px;"><div style="font-size:48px;margin-bottom:12px;">💬</div>
      <p style="color:\${T.muted};font-size:14px;">ยังไม่มีตัวละคร — ไปเพิ่มที่แท็บ 🐾</p></div>\`}
  </div>\`;
}

/* ════════════════════════════════════════════════════
   DM CHAT SCREEN
════════════════════════════════════════════════════ */
function buildDMChatScreen(T){
  const c = S.dmContact;
  if(!c) return \`<div style="padding:40px;text-align:center;color:\${T.muted};">ไม่พบตัวละคร</div>\`;

  const msgs = LS.get("chat_"+c.id,[]);
  const effectiveUrl = c.apiUrl || S.config.apiUrl;
  const effectiveKey = c.apiKey || S.config.apiKey;

  const bubbles = msgs.map(m=>{
    const isUser = m.role==="user";
    const profile = isUser ? S.myProfile : c;
    return \`<div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:10px;flex-direction:\${isUser?"row-reverse":"row"};">
      <div style="width:30px;height:30px;border-radius:50%;background:\${T.dark?T.elevated:T.bl};display:flex;align-items:center;justify-content:center;font-size:14px;overflow:hidden;flex-shrink:0;">
        \${profile.avatarImg?\`<img src="\${profile.avatarImg}" style="width:100%;height:100%;object-fit:cover;"/>\`:profile.avatar}
      </div>
      <div style="max-width:75%;">
        <div style="font-size:10px;color:\${T.muted};margin-bottom:3px;text-align:\${isUser?"right":"left"};">\${esc(isUser?S.myProfile.name||"ฉัน":c.name)}</div>
        <div style="background:\${isUser?T.p:T.bubble};color:\${isUser?"#fff":T.text};padding:10px 13px;border-radius:\${isUser?"18px 18px 4px 18px":"18px 18px 18px 4px"};font-size:14px;line-height:1.55;word-break:break-word;white-space:pre-wrap;">\${esc(m.content)}</div>
      </div>
    </div>\`;
  }).join("");

  const inputVal = S.chatInputs[c.id] || "";
  const isLoading = S._dmLoading;

  const noApiWarning = !effectiveUrl ? \`<div style="background:rgba(255,149,0,0.1);border-radius:12px;padding:10px 14px;margin-bottom:8px;text-align:center;">
    <span style="font-size:12px;color:#FF9500;">⚠️ ยังไม่ได้ตั้ง API URL — <span data-action="go-stconnect" style="text-decoration:underline;cursor:pointer;">ตั้งค่าที่นี่</span></span>
  </div>\` : "";

  return \`<div style="background:\${T.bg};height:100vh;display:flex;flex-direction:column;">
    \${topBar(T,c.name,{onBack:true, right:\`<button data-action="open-char-info" style="background:none;border:none;cursor:pointer;font-size:20px;">ℹ️</button>\`})}
    <div id="chat-scroll" style="flex:1;overflow-y:auto;padding:12px 12px 0;">
      \${noApiWarning}
      \${bubbles || \`<div style="text-align:center;padding:40px 20px;color:\${T.muted};font-size:13px;">💬 เริ่มการสนทนา</div>\`}
      \${isLoading?\`<div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:10px;">
        <div style="width:30px;height:30px;border-radius:50%;background:\${T.dark?T.elevated:T.bl};display:flex;align-items:center;justify-content:center;font-size:14px;">\${c.avatar}</div>
        <div style="background:\${T.bubble};padding:12px 16px;border-radius:18px 18px 18px 4px;">
          <span style="font-size:18px;">•••</span>
        </div>
      </div>\`:""}
      <div id="chat-end"></div>
    </div>
    <div style="padding:10px 12px 14px;border-top:0.5px solid \${T.sep};">
      <div style="display:flex;gap:8px;align-items:flex-end;">
        <textarea id="dm-input" rows="1" placeholder="พิมพ์ข้อความ..." \${isLoading?"disabled":""}
          style="flex:1;background:\${T.dark?T.elevated:T.bg};border:0.5px solid \${T.border};border-radius:20px;padding:11px 16px;color:\${T.text};font-size:14px;outline:none;resize:none;max-height:120px;overflow-y:auto;font-family:'Kanit',sans-serif;">\${esc(inputVal)}</textarea>
        <button id="dm-send-btn" \${isLoading?"disabled":""}
          style="width:44px;height:44px;border-radius:50%;background:\${isLoading?T.muted:T.g};border:none;cursor:\${isLoading?"not-allowed":"pointer"};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>
  </div>\`;
}

/* ════════════════════════════════════════════════════
   PROFILE SCREEN
════════════════════════════════════════════════════ */
function buildProfileScreen(T){
  const mp = S.myProfile;
  const fieldSt = \`width:100%;background:\${T.dark?T.elevated:T.bg};border:0.5px solid \${T.border};border-radius:11px;padding:9px 12px;color:\${T.text};outline:none;box-sizing:border-box;font-family:'Kanit',sans-serif;font-size:13px;\`;

  return \`<div style="background:\${T.bg};min-height:100vh;padding-bottom:80px;overflow-y:auto;height:100vh;">
    \${topBar(T,"โปรไฟล์",{right:\`<button data-nav="settings" style="background:none;border:none;cursor:pointer;font-size:20px;">⚙️</button>\`})}
    <div style="background:\${T.surface};padding:20px 16px 16px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px;">
        <div data-action="pick-my-av" style="position:relative;width:80px;height:80px;cursor:pointer;flex-shrink:0;">
          <div style="width:80px;height:80px;border-radius:50%;background:\${T.g};padding:2.5px;">
            <div style="width:100%;height:100%;border-radius:50%;background:\${T.dark?T.elevated:T.bl};display:flex;align-items:center;justify-content:center;font-size:34px;overflow:hidden;border:2px solid \${T.surface};">
              \${mp.avatarImg?\`<img src="\${mp.avatarImg}" style="width:100%;height:100%;object-fit:cover;"/>\`:mp.avatar}
            </div>
          </div>
          <div style="position:absolute;bottom:2px;right:2px;width:24px;height:24px;border-radius:50%;background:\${T.p};border:2px solid \${T.surface};display:flex;align-items:center;justify-content:center;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        </div>
        <div>
          <div style="font-size:18px;font-weight:800;">\${esc(mp.name||"ฉัน")}</div>
          <div style="font-size:13px;color:\${T.muted};margin-top:3px;">@\${esc(mp.username||"me")}</div>
          <div style="font-size:11px;color:\${T.muted};margin-top:4px;">👤 ผู้ใช้จริง</div>
        </div>
      </div>
      <div style="font-size:13px;color:\${T.sub};margin-bottom:14px;line-height:1.7;">\${esc(mp.bio||"ยังไม่มี bio")}</div>
    </div>

    <input id="my-av-file" type="file" accept="image/*" style="display:none;"/>

    <!-- Edit form -->
    <div style="padding:14px;">
      <div style="background:\${T.surface};border-radius:14px;padding:14px;border:0.5px solid \${T.border};">
        <div style="font-size:12px;font-weight:800;margin-bottom:10px;">✏️ แก้ไขโปรไฟล์</div>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">ชื่อ</label>
        <input id="my-name" value="\${esc(mp.name||"")}" placeholder="ชื่อของคุณ" style="\${fieldSt}margin-bottom:10px;"/>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">Username</label>
        <input id="my-username" value="\${esc(mp.username||"")}" placeholder="me" style="\${fieldSt}margin-bottom:10px;"/>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">Bio</label>
        <textarea id="my-bio" rows="2" placeholder="บอกเกี่ยวกับตัวเอง..." style="\${fieldSt}resize:vertical;margin-bottom:12px;">\${esc(mp.bio||"")}</textarea>
        <button data-action="save-profile" style="width:100%;background:\${T.g};border:none;border-radius:12px;padding:11px;cursor:pointer;font-size:14px;font-weight:700;color:#fff;font-family:'Kanit',sans-serif;">บันทึก</button>
      </div>
    </div>
  </div>\`;
}

/* ════════════════════════════════════════════════════
   SETTINGS SCREEN
════════════════════════════════════════════════════ */
function buildSettingsScreen(T){
  const fieldSt = \`width:100%;background:\${T.dark?T.elevated:T.bg};border:0.5px solid \${T.border};border-radius:11px;padding:9px 12px;color:\${T.text};outline:none;box-sizing:border-box;font-family:'Kanit',sans-serif;font-size:13px;\`;

  const themeSwatches = Object.entries(ACCENTS).map(([k,a])=>\`
    <div data-set-accent="\${k}" style="width:24px;height:24px;border-radius:50%;background:\${a.g};border:\${S.ak===k?\`2.5px solid \${T.text}`:\`2.5px solid transparent`};cursor:pointer;" title="\${a.lb}"></div>\`).join("");

  const toggleSt = (on)=>\`width:50px;height:28px;border-radius:99px;cursor:pointer;border:none;background:\${on?T.p:T.dark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.15)"};
    padding:3px;display:flex;align-items:center;justify-content:\${on?"flex-end":"flex-start"};flex-shrink:0;transition:background .2s;\`;

  return \`<div style="background:\${T.bg};min-height:100vh;padding-bottom:80px;overflow-y:auto;height:100vh;">
    \${topBar(T,"ตั้งค่า",{onBack:true})}
    <div style="padding:14px;">

      <!-- Appearance -->
      <div style="font-size:11px;font-weight:700;color:\${T.muted};margin-bottom:8px;text-transform:uppercase;padding-left:4px;">ลักษณะ</div>
      <div style="background:\${T.surface};border-radius:18px;overflow:hidden;border:0.5px solid \${T.border};margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 14px;">
          <div style="display:flex;align-items:center;gap:10px;"><span>🌙</span><span style="font-size:14px;font-weight:500;">โหมดมืด</span></div>
          <button data-action="toggle-dark" style="\${toggleSt(S.dark)}"><div style="width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.25);"></div></button>
        </div>
        <div style="height:0.5px;background:\${T.sep};margin-left:46px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 14px;">
          <div style="display:flex;align-items:center;gap:10px;"><span>🎨</span><span style="font-size:14px;font-weight:500;">ธีมสี</span></div>
          <div style="display:flex;gap:6px;">\${themeSwatches}</div>
        </div>
      </div>

      <!-- ST Connect -->
      <div style="font-size:11px;font-weight:700;color:\${T.muted};margin-bottom:8px;text-transform:uppercase;padding-left:4px;">SillyTavern</div>
      <div style="background:\${T.surface};border-radius:18px;overflow:hidden;border:0.5px solid \${T.border};margin-bottom:20px;">
        <div data-action="go-stconnect" style="display:flex;justify-content:space-between;align-items:center;padding:14px 14px;cursor:pointer;">
          <div style="display:flex;align-items:center;gap:10px;"><span>🔗</span><span style="font-size:14px;font-weight:500;">ตั้งค่า API & Jailbreak</span></div>
          <span style="color:\${T.muted};font-size:16px;">›</span>
        </div>
      </div>

      <!-- About -->
      <div style="background:\${T.surface};border-radius:18px;overflow:hidden;border:0.5px solid \${T.border};margin-bottom:20px;">
        <div style="padding:20px;text-align:center;">
          <div style="width:72px;height:72px;border-radius:18px;background:\${T.g};margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:34px;">🐾</div>
          <div style="font-size:20px;font-weight:900;margin-bottom:4px;">Cattagram</div>
          <div style="font-size:12px;color:\${T.muted};margin-bottom:10px;">v1.0 — ST Extension</div>
          <div style="font-size:13px;color:\${T.sub};line-height:1.8;">แอพโซเชียลสำหรับแชทกับ AI<br/>รองรับ SillyTavern & OpenAI-compatible API</div>
        </div>
      </div>
    </div>
  </div>\`;
}

/* ════════════════════════════════════════════════════
   ST CONNECT SCREEN  ← หัวใจของ Extension
════════════════════════════════════════════════════ */
function buildSTConnectScreen(T){
  const cfg = S.config;
  const fieldSt = \`width:100%;background:\${T.dark?T.elevated:T.bg};border:0.5px solid \${T.border};border-radius:11px;padding:9px 12px;color:\${T.text};outline:none;box-sizing:border-box;font-family:'Kanit',sans-serif;font-size:13px;\`;

  const presets=[
    {icon:"🃏",name:"SillyTavern (hosted)",url:"https://room01.st-cattacafe.stream"},
    {icon:"🃏",name:"SillyTavern (local)",url:"http://127.0.0.1:8000"},
    {icon:"🦙",name:"Ollama (local)",url:"http://localhost:11434"},
    {icon:"🏪",name:"LM Studio",url:"http://localhost:1234"},
  ];
  const presetBtns = presets.map(b=>\`
    <div data-set-preset="\${b.url}" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;cursor:pointer;border-bottom:0.5px solid \${T.sep};">
      <span style="font-size:13px;font-weight:600;">\${b.icon} \${b.name}</span>
      <span style="font-size:11px;color:\${T.p};">\${b.url.replace("https://","").replace("http://","")}</span>
    </div>\`).join("");

  const stImportBanner = window.__ST_CFG__?.apiUrl ? \`
    <div data-action="import-st-cfg" style="background:rgba(48,209,88,0.08);border:1px solid rgba(48,209,88,0.3);border-radius:14px;padding:12px 14px;margin-bottom:14px;cursor:pointer;display:flex;align-items:center;gap:10px;">
      <span style="font-size:20px;">🃏</span>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;color:#30D158;">ตรวจพบ ST Config!</div>
        <div style="font-size:11px;color:\${T.muted};margin-top:2px;word-break:break-all;">\${esc(window.__ST_CFG__.apiUrl)}</div>
      </div>
      <span style="font-size:12px;font-weight:700;color:#30D158;flex-shrink:0;">แตะนำเข้า</span>
    </div>\` : "";

  return \`<div style="background:\${T.bg};min-height:100vh;padding-bottom:40px;overflow-y:auto;height:100vh;">
    \${topBar(T,"เชื่อม SillyTavern",{onBack:true})}
    <div style="padding:14px;">

      \${stImportBanner}

      <!-- API Section -->
      <div style="background:\${T.surface};border-radius:14px;padding:14px;margin-bottom:14px;border:0.5px solid \${T.border};">
        <div style="font-size:12px;font-weight:800;margin-bottom:12px;">🔗 API Connection</div>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">Global API URL</label>
        <input id="cfg-apiurl" value="\${esc(cfg.apiUrl||"")}" placeholder="https://..." style="\${fieldSt}font-family:monospace;font-size:11px;margin-bottom:10px;"/>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">API Key (ถ้ามี)</label>
        <input id="cfg-apikey" type="password" value="\${esc(cfg.apiKey||"")}" placeholder="sk-... หรือว่างถ้า ST ไม่ได้ตั้ง password" style="\${fieldSt}margin-bottom:12px;"/>

        <div style="background:\${T.dark?T.elevated:T.bg};border-radius:12px;padding:10px 12px;margin-bottom:12px;">
          <div style="font-size:11px;font-weight:700;color:\${T.muted};margin-bottom:8px;">เลือก preset</div>
          \${presetBtns}
        </div>

        <button id="cfg-test-btn" style="width:100%;background:\${T.p};border:none;border-radius:12px;padding:11px;cursor:pointer;font-size:14px;font-weight:600;color:#fff;font-family:'Kanit',sans-serif;margin-bottom:8px;">🔌 ทดสอบเชื่อมต่อ</button>
        <div id="cfg-test-result" style="margin-bottom:10px;"></div>
        <button data-action="save-cfg" style="width:100%;background:\${T.g};border:none;border-radius:12px;padding:11px;cursor:pointer;font-size:14px;font-weight:700;color:#fff;font-family:'Kanit',sans-serif;">บันทึก</button>
      </div>

      <!-- Jailbreak Section -->
      <div style="background:\${T.surface};border-radius:14px;padding:14px;margin-bottom:14px;border:0.5px solid \${T.border};">
        <div style="font-size:12px;font-weight:800;margin-bottom:4px;">💉 Jailbreak / System Injection</div>
        <div style="font-size:11px;color:\${T.muted};margin-bottom:10px;">Inject เข้า SillyTavern Extension Prompt โดยตรง</div>
        <label style="font-size:11px;font-weight:700;color:\${T.muted};display:block;margin-bottom:4px;">Jailbreak Text</label>
        <textarea id="cfg-jb" rows="6" placeholder="ใส่ jailbreak / system prompt ของคุณที่นี่..."
          style="\${fieldSt}resize:vertical;margin-bottom:10px;font-size:12px;">\${esc(cfg.jailbreak||"")}</textarea>
        <div style="display:flex;gap:8px;">
          <button data-action="apply-jb" style="flex:1;background:\${cfg.jbActive?"#30D158":T.p};border:none;border-radius:11px;padding:10px;cursor:pointer;font-size:13px;font-weight:700;color:#fff;font-family:'Kanit',sans-serif;">
            \${cfg.jbActive?"✅ Jailbreak Active":"💉 ใส่ Jailbreak"}
          </button>
          <button data-action="clear-jb" style="flex:1;background:rgba(255,59,48,0.12);border:none;border-radius:11px;padding:10px;cursor:pointer;font-size:13px;font-weight:700;color:#FF3B30;font-family:'Kanit',sans-serif;">🔒 ปิด</button>
        </div>
      </div>

    </div>
  </div>\`;
}

/* ════════════════════════════════════════════════════
   ATTACH EVENTS (after innerHTML)
════════════════════════════════════════════════════ */
function attachEvents(T){
  const root = document.getElementById("cg-root");
  if(!root) return;

  /* ── Bottom nav ── */
  root.querySelectorAll("[data-nav]").forEach(el=>{
    el.addEventListener("click", e=>{
      e.stopPropagation();
      const n = el.dataset.nav;
      if(n==="create"){ showToast("📷 ฟีเจอร์สร้างโพสต์"); return; }
      S.screen = n;
      renderApp();
    });
  });

  /* ── Back button ── */
  root.querySelectorAll("[data-action='back']").forEach(el=>{
    el.addEventListener("click", ()=>{ S.screen = S.prevScreen || "home"; renderApp(); });
  });

  /* ── Go to ST connect ── */
  root.querySelectorAll("[data-action='go-stconnect']").forEach(el=>{
    el.addEventListener("click", ()=>{ S.prevScreen=S.screen; S.screen="st_connect"; renderApp(); });
  });

  /* ── Toggle dark ── */
  root.querySelectorAll("[data-action='toggle-dark']").forEach(el=>{
    el.addEventListener("click", ()=>{ S.dark=!S.dark; LS.set("dark",S.dark); renderApp(); });
  });

  /* ── Set accent ── */
  root.querySelectorAll("[data-set-accent]").forEach(el=>{
    el.addEventListener("click", ()=>{ S.ak=el.dataset.setAccent; LS.set("ak",S.ak); renderApp(); });
  });

  /* ── Characters ── */
  root.querySelectorAll("[data-action='new-char']").forEach(el=>{
    el.addEventListener("click", ()=>{
      S._editingChar = {id:"__new__",name:"",displayName:"",avatar:"🐱",avatarImg:null,bio:"",online:true,verified:false,apiUrl:"",apiKey:"",systemPrompt:"",charCard:""};
      S.prevScreen = S.screen;
      S.screen = "char_edit";
      renderApp();
    });
  });
  root.querySelectorAll("[data-edit-char]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const id = el.dataset.editChar;
      S._editingChar = JSON.parse(JSON.stringify(S.chars.find(c=>c.id===id)||{}));
      S.prevScreen = S.screen;
      S.screen = "char_edit";
      renderApp();
    });
  });
  root.querySelectorAll("[data-del-char]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const id = el.dataset.delChar;
      if(confirm("ลบตัวละครนี้?")){ S.chars=S.chars.filter(c=>c.id!==id); LS.set("chars",S.chars); renderApp(); showToast("ลบแล้ว"); }
    });
  });

  /* ── Char edit: avatar emoji ── */
  root.querySelectorAll("[data-set-av]").forEach(el=>{
    el.addEventListener("click", ()=>{
      if(S._editingChar){ S._editingChar.avatar=el.dataset.setAv; S._editingChar.avatarImg=null; renderApp(); }
    });
  });

  /* ── Char edit: avatar image file ── */
  const ceAvAction = root.querySelector("[data-action='pick-av-img']");
  const ceAvFile   = root.querySelector("#ce-av-file");
  if(ceAvAction && ceAvFile){
    ceAvAction.addEventListener("click", ()=>ceAvFile.click());
    ceAvFile.addEventListener("change", e=>{
      const f=e.target.files?.[0]; if(!f) return;
      const r=new FileReader();
      r.onload=ev=>{ if(S._editingChar){ S._editingChar.avatarImg=ev.target.result; renderApp(); } };
      r.readAsDataURL(f);
    });
  }

  /* ── Char edit: save ── */
  root.querySelectorAll("[data-action='save-char']").forEach(el=>{
    el.addEventListener("click", ()=>{
      const name = root.querySelector("#ce-name")?.value?.trim();
      if(!name){ showToast("⚠️ กรุณาใส่ username"); return; }
      const c = {
        ...S._editingChar,
        name,
        displayName: root.querySelector("#ce-display")?.value?.trim()||"",
        bio:         root.querySelector("#ce-bio")?.value?.trim()||"",
        apiUrl:      root.querySelector("#ce-apiurl")?.value?.trim()||"",
        apiKey:      root.querySelector("#ce-apikey")?.value?.trim()||"",
        systemPrompt:root.querySelector("#ce-sysprompt")?.value?.trim()||"",
        charCard:    root.querySelector("#ce-charcard")?.value?.trim()||"",
        online:      root.querySelector("#ce-online")?.checked||false,
        verified:    root.querySelector("#ce-verified")?.checked||false,
      };
      if(c.id==="__new__") c.id="c"+Date.now();
      const idx = S.chars.findIndex(x=>x.id===c.id);
      if(idx>=0) S.chars[idx]=c; else S.chars.push(c);
      LS.set("chars",S.chars);
      S.screen = S.prevScreen||"chars";
      renderApp();
      showToast("บันทึกตัวละครแล้ว ✓");
    });
  });

  /* ── Char edit: test connection ── */
  const ceTestBtn = root.querySelector("#ce-test-btn");
  const ceTestRes = root.querySelector("#ce-test-result");
  if(ceTestBtn && ceTestRes){
    ceTestBtn.addEventListener("click", async()=>{
      ceTestBtn.disabled=true; ceTestBtn.textContent="กำลังทดสอบ...";
      try{
        const url = root.querySelector("#ce-apiurl")?.value?.trim()||S.config.apiUrl;
        const key = root.querySelector("#ce-apikey")?.value?.trim()||S.config.apiKey;
        const sys = root.querySelector("#ce-sysprompt")?.value?.trim()||"ตอบสั้น";
        const reply = await callAI({apiUrl:url,apiKey:key,systemPrompt:sys,charCard:"",history:[],userText:"สวัสดี ทดสอบ ตอบ 1 ประโยค"});
        ceTestRes.innerHTML=\`<div style="color:#30D158;font-size:13px;">✅ \${esc(reply.slice(0,80))}</div>\`;
      }catch(e){
        ceTestRes.innerHTML=\`<div style="color:#FF3B30;font-size:13px;">❌ \${esc(e.message)}</div>\`;
      }
      ceTestBtn.disabled=false; ceTestBtn.textContent="🔌 ทดสอบเชื่อมต่อ";
    });
  }

  /* ── DM list: open chat ── */
  root.querySelectorAll("[data-open-dm]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const id = el.dataset.openDm;
      S.dmContact = S.chars.find(c=>c.id===id)||null;
      if(S.dmContact){ S.prevScreen="dm"; S.screen="dm_chat"; renderApp(); }
    });
  });

  /* ── DM chat: input & send ── */
  const dmInput   = root.querySelector("#dm-input");
  const dmSendBtn = root.querySelector("#dm-send-btn");
  if(dmInput){
    dmInput.addEventListener("input", e=>{
      if(S.dmContact) S.chatInputs[S.dmContact.id]=e.target.value;
      // Auto-resize
      dmInput.style.height="auto";
      dmInput.style.height=Math.min(dmInput.scrollHeight,120)+"px";
    });
    dmInput.addEventListener("keydown", e=>{
      if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendDM(); }
    });
  }
  if(dmSendBtn) dmSendBtn.addEventListener("click", ()=>sendDM());

  // Auto-scroll
  const chatEnd = root.querySelector("#chat-end");
  if(chatEnd) requestAnimationFrame(()=>chatEnd.scrollIntoView({behavior:"smooth"}));

  /* ── Profile: save ── */
  root.querySelectorAll("[data-action='save-profile']").forEach(el=>{
    el.addEventListener("click", ()=>{
      S.myProfile = {
        ...S.myProfile,
        name:     root.querySelector("#my-name")?.value?.trim()||S.myProfile.name,
        username: root.querySelector("#my-username")?.value?.trim()||S.myProfile.username,
        bio:      root.querySelector("#my-bio")?.value?.trim()||"",
      };
      LS.set("myProfile",S.myProfile);
      showToast("บันทึกแล้ว ✓");
      renderApp();
    });
  });

  /* ── Profile: my avatar file ── */
  const myAvAction = root.querySelector("[data-action='pick-my-av']");
  const myAvFile   = root.querySelector("#my-av-file");
  if(myAvAction && myAvFile){
    myAvAction.addEventListener("click", ()=>myAvFile.click());
    myAvFile.addEventListener("change", e=>{
      const f=e.target.files?.[0]; if(!f) return;
      const r=new FileReader();
      r.onload=ev=>{ S.myProfile.avatarImg=ev.target.result; LS.set("myProfile",S.myProfile); renderApp(); };
      r.readAsDataURL(f);
    });
  }

  /* ── ST Connect: preset ── */
  root.querySelectorAll("[data-set-preset]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const url = el.dataset.setPreset;
      const inp = root.querySelector("#cfg-apiurl");
      if(inp) inp.value = url;
    });
  });

  /* ── ST Connect: import from ST ── */
  root.querySelectorAll("[data-action='import-st-cfg']").forEach(el=>{
    el.addEventListener("click", ()=>{
      if(window.__ST_CFG__?.apiUrl){
        const urlInp = root.querySelector("#cfg-apiurl");
        const keyInp = root.querySelector("#cfg-apikey");
        if(urlInp) urlInp.value = window.__ST_CFG__.apiUrl;
        if(keyInp) keyInp.value = window.__ST_CFG__.apiKey||"";
        showToast("📥 นำเข้า ST Config แล้ว ✓");
        // Request fresh config from parent
        cgBridge.getSTConfig();
      }
    });
  });

  /* ── ST Connect: test ── */
  const cfgTestBtn = root.querySelector("#cfg-test-btn");
  const cfgTestRes = root.querySelector("#cfg-test-result");
  if(cfgTestBtn && cfgTestRes){
    cfgTestBtn.addEventListener("click", async()=>{
      cfgTestBtn.disabled=true; cfgTestBtn.textContent="กำลังทดสอบ...";
      const url = root.querySelector("#cfg-apiurl")?.value?.trim()||"";
      const key = root.querySelector("#cfg-apikey")?.value?.trim()||"";
      try{
        const reply = await callAI({apiUrl:url,apiKey:key,systemPrompt:"ตอบสั้น",charCard:"",history:[],userText:"สวัสดี ทดสอบ ตอบ 1 ประโยค"});
        cfgTestRes.innerHTML=\`<div style="color:#30D158;font-size:13px;">✅ \${esc(reply.slice(0,60))}</div>\`;
      }catch(e){
        cfgTestRes.innerHTML=\`<div style="color:#FF3B30;font-size:13px;">❌ \${esc(e.message)}</div>\`;
      }
      cfgTestBtn.disabled=false; cfgTestBtn.textContent="🔌 ทดสอบเชื่อมต่อ";
    });
  }

  /* ── ST Connect: save cfg ── */
  root.querySelectorAll("[data-action='save-cfg']").forEach(el=>{
    el.addEventListener("click", ()=>{
      S.config.apiUrl = root.querySelector("#cfg-apiurl")?.value?.trim()||"";
      S.config.apiKey = root.querySelector("#cfg-apikey")?.value?.trim()||"";
      S.config.jailbreak = root.querySelector("#cfg-jb")?.value?.trim()||"";
      LS.set("config",S.config);
      showToast("บันทึก API แล้ว ✓");
      renderApp();
    });
  });

  /* ── ST Connect: apply jailbreak ── */
  root.querySelectorAll("[data-action='apply-jb']").forEach(el=>{
    el.addEventListener("click", ()=>{
      S.config.jailbreak = root.querySelector("#cfg-jb")?.value?.trim()||"";
      LS.set("config",S.config);
      if(S.config.jailbreak){
        S.config.jbActive = true;
        cgBridge.setJB(S.config.jailbreak);
        showToast("💉 Jailbreak Active ✓");
      } else {
        showToast("⚠️ ใส่ jailbreak text ก่อน");
      }
      renderApp();
    });
  });

  /* ── ST Connect: clear jailbreak ── */
  root.querySelectorAll("[data-action='clear-jb']").forEach(el=>{
    el.addEventListener("click", ()=>{
      S.config.jbActive = false;
      cgBridge.clearJB();
      LS.set("config",S.config);
      showToast("🔒 Jailbreak ปิดแล้ว");
      renderApp();
    });
  });

  /* ── Nav settings ── */
  root.querySelectorAll("[data-nav='settings']").forEach(el=>{
    el.addEventListener("click", ()=>{ S.prevScreen=S.screen; S.screen="settings"; renderApp(); });
  });
}

/* ════════════════════════════════════════════════════
   SEND DM
════════════════════════════════════════════════════ */
async function sendDM(){
  if(!S.dmContact || S._dmLoading) return;
  const input = document.getElementById("dm-input");
  const text  = (input?.value||S.chatInputs[S.dmContact.id]||"").trim();
  if(!text) return;

  // Clear input
  if(input) input.value="";
  if(S.dmContact) S.chatInputs[S.dmContact.id]="";

  const c = S.dmContact;
  const chatKey = "chat_"+c.id;
  let msgs = LS.get(chatKey,[]);
  msgs.push({role:"user",content:text});
  LS.set(chatKey,msgs.slice(-200));

  S._dmLoading = true;
  renderApp();

  try{
    const history = msgs.slice(-20).slice(0,-1).map(m=>({role:m.role,content:m.content}));
    const reply = await callAI({
      apiUrl:   c.apiUrl||S.config.apiUrl,
      apiKey:   c.apiKey||S.config.apiKey,
      systemPrompt: c.systemPrompt,
      charCard: c.charCard,
      history,
      userText: text,
    });
    msgs = LS.get(chatKey,[]);
    msgs.push({role:"assistant",content:reply});
    LS.set(chatKey,msgs.slice(-200));
  }catch(e){
    msgs = LS.get(chatKey,[]);
    msgs.push({role:"assistant",content:"❌ "+e.message});
    LS.set(chatKey,msgs);
  }

  S._dmLoading = false;
  renderApp();
}

/* ════════════════════════════════════════════════════
   ESCAPE HTML
════════════════════════════════════════════════════ */
function esc(str){
  if(!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

/* ════════════════════════════════════════════════════
   ST CONFIG SYNC
════════════════════════════════════════════════════ */
window.__onSTConfig = function(cfg){
  if(cfg && cfg.apiUrl && !S.config.apiUrl){
    window.__ST_CFG__ = cfg;
    S.config.apiUrl = cfg.apiUrl;
    S.config.apiKey = cfg.apiKey||"";
    LS.set("config",S.config);
    renderApp();
  } else if(cfg) {
    window.__ST_CFG__ = cfg;
    renderApp();
  }
};

/* ════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════ */
renderApp();

// Ask parent for fresh ST config on boot
setTimeout(()=>{ cgBridge.getSTConfig(); }, 500);
</script>
</body>
</html>`;
    }

    /* ══════════════════════════════════════════════
       INIT
    ══════════════════════════════════════════════ */
    function init() {
        buildToggleBtn();
        buildWindow();

        // Auto-restore open state
        if (localStorage.getItem(LS_OPEN) === "1") {
            openWindow();
        }

        // Watch for ST config changes (API key etc.)
        let _cfgWatch = null;
        function watchSTConfig() {
            if (_cfgWatch) clearInterval(_cfgWatch);
            _cfgWatch = setInterval(() => {
                const freshCfg = getSTConfig();
                if (freshCfg.apiUrl) {
                    sendToFrame({ type: "ST_CONFIG", payload: freshCfg });
                }
            }, 5000);
        }
        watchSTConfig();

        console.log("[Cattagram] Extension loaded ✓ — click 🐾 to open");
    }

    waitReady(init);

})();
