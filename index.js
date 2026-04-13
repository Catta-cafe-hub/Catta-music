/**
 * 🐾 CATTA MUSIC PLAYER — SillyTavern Extension (Full & Stable Version)
 * ═══════════════════════════════════════════════════
 * Developed for Catta-Cafe | Dante Style DOM Observer
 * All features included: Hard-Lock, Dual Mode, Smart Position, No-SSL dependency.
 * + INLINE MUSIC PLAYER & MULTI-CHARACTER PLAYLISTS
 */

(function() {
    "use strict";

    // ══════════════════════════════════════════════
    // 1. CONSTANTS & CONFIG
    // ══════════════════════════════════════════════
    const EXT_ID = "cattamusic";
    const WIN_ID = "cattamusic-player-window";
    const BUBBLE_ID = "cattamusic-bubble";
    const LS_CUSTOM_PLAYLISTS = "cattamusic_custom_playlists";
    const LS_SETTINGS = "cattamusic_settings";
    const ICON_URL = "https://file.garden/aZx9zS2e7UEiSmfr/cattamusic.png";

    const CHAT_MUSIC_REGEX = /::::\s*\[music\]\s*(.*?)\s*\((https?:\/\/([^\s)]+))\)\s*::::/i;
    const PLAYLIST_BLOCK_REGEX = /\[Catta-music-playlist\s*([\s\S]*?)\]/i;

    let settings = {
        showBubble: true, isEnabled: true, autoMood: true, theme: 'orange', 
        apiUrl: 'http://localhost:2096', // URL ของ Casa API
        posBubble: { top: '80%', left: '10%' }
    };

    // Data Structure รองรับหลาย Playlist
    let customPlaylists = {
        "default": { name: "รายการส่วนตัว", avatar: ICON_URL, tracks: [] }
    };
    
    let charPlaylist = []; // Playlist ที่ดึงอัตโนมัติจากแชท
    
    // State การแสดงผลและการเล่น
    let viewingSource = { type: 'user', id: 'default' }; 
    let playingSource = { type: 'user', id: 'default' }; 
    let currentTrackIndex = -1;

    let audioPlayer = new Audio();
    let isPlaying = false;
    let volume = 3;
    let loopMode = 0;
    let isAuthorized = false;
    let lastProcessedMsgId = "";

    const themes = {
        orange: { main: '#ff9800', bg: '#fffaf0', screen: '#e0f2f1', text: '#333' },
        pink: { main: '#f06292', bg: '#fce4ec', screen: '#f8bbd0', text: '#880e4f' },
        blue: { main: '#2196f3', bg: '#e3f2fd', screen: '#bbdefb', text: '#0d47a1' },
        dark: { main: '#424242', bg: '#212121', screen: '#37474f', text: '#eceff1' },
        purple: { main: '#9c27b0', bg: '#f3e5f5', screen: '#e1bee7', text: '#4a148c' }
    };

    // ══════════════════════════════════════════════
    // 2. CSS STYLES (Inline UI)
    // ══════════════════════════════════════════════
    if (!$('#cattamusic-inline-css').length) {
        const inlineCSS = `
        <style id="cattamusic-inline-css">
            .catta-inline-music {
                display: inline-flex; align-items: center; 
                background: #111111;
                color: #ffffff !important; padding: 6px 14px; border-radius: 20px; 
                cursor: pointer; font-family: sans-serif; font-size: 13px; 
                box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: all 0.2s ease; margin: 5px 0;
                border: 1px solid rgba(255,255,255,0.1);
            }
            .catta-inline-music:hover { 
                transform: translateY(-2px); 
                box-shadow: 0 6px 14px rgba(0,0,0,0.5); 
                border: 1px solid var(--catta-main, #ff9800);
            }
            .catta-inline-music .music-icon { margin-right: 10px; font-size: 18px; color: var(--catta-main, #ff9800); }
            .catta-inline-music .music-info { display: flex; flex-direction: column; line-height: 1.3; }
            .catta-inline-music .music-title { font-weight: bold; color: #ffffff; }
            .catta-inline-music .music-status { font-size: 10px; color: var(--catta-main, #aaaaaa); text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; }
            
            /* Cover Area UI */
            .cattamusic-cover-area { display:flex; align-items:center; padding:10px 15px; border-bottom: 1px solid rgba(0,0,0,0.1); }
            .cattamusic-cover-img { width:45px; height:45px; border-radius:50%; object-fit:cover; margin-right:10px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.5s; }
            .cattamusic-cover-img.spinning { animation: cattaSpin 4s linear infinite; }
            @keyframes cattaSpin { 100% { transform: rotate(360deg); } }
        </style>`;
        $('head').append(inlineCSS);
    }

    // ══════════════════════════════════════════════
    // 3. DATA CORE
    // ══════════════════════════════════════════════
    function loadData() {
        const s = localStorage.getItem(LS_SETTINGS);
        if (s) settings = { ...settings, ...JSON.parse(s) };
        
        const cp = localStorage.getItem(LS_CUSTOM_PLAYLISTS);
        if (cp) {
            customPlaylists = JSON.parse(cp);
        } else {
            // ระบบ Migrate Data ป้องกันการสูญหายจากเวอร์ชั่นเก่า
            const p = localStorage.getItem('cattamusic_user_playlist');
            if (p) customPlaylists["default"].tracks = JSON.parse(p);
        }
        if (!customPlaylists["default"]) customPlaylists["default"] = { name: "รายการส่วนตัว", avatar: ICON_URL, tracks: [] };
    }

    function saveData() {
        localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
        localStorage.setItem(LS_CUSTOM_PLAYLISTS, JSON.stringify(customPlaylists));
    }

    function checkAuth() {
        const uid = localStorage.getItem('catta_uid') || localStorage.getItem('dante_uid');
        const token = localStorage.getItem('catta_auth_token') || localStorage.getItem('dante_token');
        isAuthorized = !!(uid && token);
        if (!isAuthorized) showLockedUI(); else hideLockedUI();
        return isAuthorized;
    }

    function getViewingArray() { return viewingSource.type === 'user' ? customPlaylists[viewingSource.id].tracks : charPlaylist; }
    function getPlayingArray() { return playingSource.type === 'user' ? customPlaylists[playingSource.id].tracks : charPlaylist; }

    // ══════════════════════════════════════════════
    // 4. SCANNER & INLINE UI (Dante Style)
    // ══════════════════════════════════════════════
    function scanLatestChat() {
        if (!settings.isEnabled || !isAuthorized) return;

        const chatMessages = document.querySelectorAll('.mes_text');
        if (chatMessages.length === 0) return;

        const latestMsgBox = chatMessages[chatMessages.length - 1];
        const msgId = latestMsgBox.closest('.mes')?.getAttribute('mesid') || latestMsgBox.innerText.substring(0, 30);
        
        // บันทึกข้อความเดิมก่อนเพื่อนำไปสแกนหา Playlist และ AutoPlay
        const originalText = latestMsgBox.innerText;

        // วาด UI ปุ่ม Music ทับข้อความดิบ
        chatMessages.forEach(msgBox => {
            if (msgBox.innerHTML.includes('::::') && msgBox.innerHTML.includes('[music]')) {
                msgBox.innerHTML = msgBox.innerHTML.replace(
                    /::::\s*\[music\]\s*(.*?)\s*\((https?:\/\/[^\s)]+)\)\s*::::/gi,
                    `<div class="catta-inline-music" data-url="$2" data-name="$1">
                        <div class="music-icon"><i class="fa-solid fa-compact-disc fa-spin"></i></div>
                        <div class="music-info">
                            <span class="music-title">$1</span>
                            <span class="music-status">▶ คลิกเพื่อเล่น</span>
                        </div>
                     </div>`
                );
            }
        });

        if (msgId === lastProcessedMsgId) return;
        lastProcessedMsgId = msgId;

        // A. Single Song Trigger
        const musicMatch = originalText.match(CHAT_MUSIC_REGEX);
        if (musicMatch) {
            const track = { name: "✨ " + musicMatch[1].trim(), url: musicMatch[2].trim(), mood: "shared" };
            if (!charPlaylist.some(t => t.url === track.url)) {
                charPlaylist.unshift(track);
                if (viewingSource.type === 'char') renderPlaylist();
            }
            playTrack(charPlaylist.findIndex(t => t.url === track.url), 'char', 'default');
            return;
        }

        // B. Playlist Block
        const playlistMatch = originalText.match(PLAYLIST_BLOCK_REGEX);
        if (playlistMatch) {
            let found = [];
            const trackRegex = /(?:\d+\.\s*)?([^;]+);([^;]+);(?:\(([^)]+)\)|([^,\n]+))/g;
            let tm;
            while ((tm = trackRegex.exec(playlistMatch[1])) !== null) {
                found.push({ name: tm[1].trim(), url: tm[2].trim(), mood: (tm[3] || tm[4] || "").trim().toLowerCase() });
            }
            if (found.length > 0) {
                charPlaylist = found;
                notifyUser("✨ ตรวจพบเพลย์ลิสต์ใหม่จากตัวละคร!");
                if(viewingSource.type === 'char') renderPlaylist();
            }
        }

        // C. Mood Sync
        if (settings.autoMood && charPlaylist.length > 0) {
            const textLower = originalText.toLowerCase();
            const moodTrack = charPlaylist.find(t => t.mood && t.mood.split('|').some(m => textLower.includes(m.trim())));
            if (moodTrack) playTrack(charPlaylist.indexOf(moodTrack), 'char', 'default');
        }
    }

    // Global Click Handler สำหรับ Inline Player
    $(document).off('click', '.catta-inline-music').on('click', '.catta-inline-music', function() {
        if (!isAuthorized) { alert("🔒 โปรดเข้าสู่ระบบ Catta Cafe"); return; }
        const url = $(this).data('url');
        const name = $(this).data('name');
        
        if (!charPlaylist.some(t => t.url === url)) {
            charPlaylist.unshift({ name: "✨ " + name, url: url, mood: "shared" });
        }
        
        // เด้งหน้าต่าง Player และเล่นเพลง
        const win = $(`#${WIN_ID}`);
        if (!win.is(':visible')) {
            win.css({ top: '10px', left: '50%', transform: 'translateX(-50%)' });
            win.fadeIn(200);
        }
        
        switchTab('char');
        playTrack(charPlaylist.findIndex(t => t.url === url), 'char', 'default');
    });

    // ══════════════════════════════════════════════
    // 5. UI COMPONENTS
    // ══════════════════════════════════════════════
    function buildSettings() {
        if ($(`#${EXT_ID}-settings`).length) return;
        const html = `
            <div id="${EXT_ID}-settings" class="cattamusic-settings-block">
                <h4>🐾 Catta Music Player</h4>
                <div class="flex-container flex-align-center"><input type="checkbox" id="catta-cfg-enabled" ${settings.isEnabled?'checked':''}><label for="catta-cfg-enabled">เปิดการทำงาน</label></div>
                <div class="flex-container flex-align-center"><input type="checkbox" id="catta-cfg-bubble" ${settings.showBubble?'checked':''}><label for="catta-cfg-bubble">แสดงไอคอนลอย (Bubble)</label></div>
                <div class="flex-container flex-align-center"><input type="checkbox" id="catta-cfg-mood" ${settings.autoMood?'checked':''}><label for="catta-cfg-mood">Mood Sync (Auto Play)</label></div>
                <div style="margin-top:10px;"><label>Casa API URL (สำหรับการเชื่อมต่อข้อมูลตัวละคร):</label><input type="text" id="catta-cfg-api" value="${settings.apiUrl}" placeholder="http://ip:port" style="width:100%; box-sizing:border-box; margin-top:5px;"></div>
                <div style="margin-top:10px;"><label>สีธีม:</label><div class="theme-selectors">${Object.keys(themes).map(t=>`<div class="theme-dot" data-theme="${t}" style="background:${themes[t].main}"></div>`).join('')}</div></div>
            </div>`;
        $('#extensions_settings').append(html);
        $('#catta-cfg-enabled').on('change', function() { settings.isEnabled = this.checked; saveData(); location.reload(); });
        $('#catta-cfg-bubble').on('change', function() { settings.showBubble = this.checked; $(`#${BUBBLE_ID}`).toggle(settings.showBubble); saveData(); });
        $('#catta-cfg-mood').on('change', function() { settings.autoMood = this.checked; saveData(); });
        $('#catta-cfg-api').on('change', function() { settings.apiUrl = this.value; saveData(); });
        $('.theme-dot').on('click', function() { applyTheme($(this).data('theme')); });
    }

    function buildBubble() {
        if (!settings.isEnabled || document.getElementById(BUBBLE_ID)) return;
        const bubble = document.createElement('div');
        bubble.id = BUBBLE_ID;
        bubble.style.cssText = `position:fixed; width:60px; height:60px; top:${settings.posBubble.top}; left:${settings.posBubble.left}; background:url('${ICON_URL}') no-repeat center/contain; z-index:10001; cursor:pointer; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.3)); display:${settings.showBubble?'block':'none'};`;
        document.body.appendChild(bubble);
        makeDraggable(bubble, null, true);
        
        let sX, sY;
        bubble.addEventListener('mousedown', (e)=>{sX=e.clientX; sY=e.clientY;});
        bubble.addEventListener('touchstart', (e)=>{sX=e.touches[0].clientX; sY=e.touches[0].clientY;});
        const click = (e) => {
            const cX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
            const cY = e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY;
            if (Math.abs(cX-sX)<5 && Math.abs(cY-sY)<5) togglePlayerSmart();
        };
        bubble.addEventListener('mouseup', click); bubble.addEventListener('touchend', click);
    }

    function buildPlayerWindow() {
        if (document.getElementById(WIN_ID)) return;
        const html = `
            <div id="${WIN_ID}" style="display: none; position: fixed; z-index: 10000; top: 10px; left: 50%; transform: translateX(-50%);">
                <div class="cattamusic-header"><span>🐾 Catta Music</span><button id="catta-close-win">×</button></div>
                
                <div class="cattamusic-cover-area">
                    <img id="catta-cover-img" class="cattamusic-cover-img" src="${ICON_URL}">
                    <div style="flex-grow:1; overflow:hidden;">
                        <div id="catta-cover-title" style="font-weight:bold; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">รายการส่วนตัว</div>
                        <div class="cattamusic-marquee-container" style="margin-top:2px;">
                            <div id="catta-display-name" class="cattamusic-marquee" style="font-size:12px; opacity:0.8;">Catta Music Ready!</div>
                        </div>
                    </div>
                </div>

                <div class="cattamusic-screen" style="border-top:none;">
                    <div class="cattamusic-status-bar"><span id="catta-time">00:00</span><span id="catta-vol">Vol: 3</span><span id="catta-track-count">0 tracks</span></div>
                </div>
                
                <div class="cattamusic-controls">
                    <button id="catta-btn-loop"><i class="fa-solid fa-arrow-right"></i></button>
                    <button id="catta-btn-prev"><i class="fa-solid fa-backward-step"></i></button>
                    <button id="catta-btn-play"><i class="fa-solid fa-play"></i></button>
                    <button id="catta-btn-next"><i class="fa-solid fa-forward-step"></i></button>
                    <button id="catta-btn-voldown"><i class="fa-solid fa-volume-low"></i></button>
                    <button id="catta-btn-volup"><i class="fa-solid fa-volume-high"></i></button>
                </div>
                
                <div class="cattamusic-tabs">
                    <button id="catta-tab-user">👤 ส่วนตัว</button>
                    <button id="catta-tab-char">🐱 ตัวละคร</button>
                </div>
                
                <div class="cattamusic-playlist">
                    <!-- Playlist Manager (ค้นหาตัวละคร) -->
                    <div id="catta-playlist-manager" style="display:flex; gap:5px; padding:8px 10px; background:rgba(0,0,0,0.05); align-items:center;">
                        <select id="catta-list-selector" style="flex-grow:1; border-radius:4px; border:1px solid #ccc; padding:4px; font-size:12px; background:white; color:black; outline:none; cursor:pointer;"></select>
                        <input type="text" id="catta-search-char" placeholder="ID/ชื่อตัวละคร" style="width:85px; font-size:12px; padding:4px; border-radius:4px; border:1px solid #ccc; background:white; color:black; outline:none;">
                        <button id="catta-btn-search-char" class="catta-btn-small" style="padding:4px 8px;" title="สร้างเพลย์ลิสต์ตัวละคร"><i class="fa-solid fa-magnifying-glass"></i></button>
                        <button id="catta-btn-del-list" class="catta-btn-small" style="background:#e53935; padding:4px 8px;" title="ลบเพลย์ลิสต์นี้"><i class="fa-solid fa-trash"></i></button>
                    </div>

                    <div id="catta-user-input"><input type="text" id="catta-input-url" placeholder="วางลิ้งค์ .mp3 ..."><button id="catta-btn-save" class="catta-btn-small">Add Music</button></div>
                    <div id="catta-list-display" class="catta-scroll-list"></div>
                </div>
            </div>`;
        $("body").append(html);
        
        // Event Listeners สำหรับ Player
        $('#catta-tab-user').on('click', () => switchTab('user'));
        $('#catta-tab-char').on('click', () => switchTab('char'));
        $("#catta-btn-play").on('click', () => { 
            if(isAuthorized) { 
                if(!isPlaying && !audioPlayer.src) { lastProcessedMsgId = ""; scanLatestChat(); }
                togglePlay(); 
            } 
        });
        $("#catta-btn-next").on('click', () => isAuthorized && playNext());
        $("#catta-btn-prev").on('click', () => isAuthorized && playPrev());
        $("#catta-btn-volup").on('click', () => isAuthorized && changeVolume(1));
        $("#catta-btn-voldown").on('click', () => isAuthorized && changeVolume(-1));
        $("#catta-btn-loop").on('click', () => isAuthorized && changeLoopMode());
        $("#catta-close-win").on('click', () => $(`#${WIN_ID}`).fadeOut(200));
        
        // จัดการ Custom Playlist
        updateListSelector();
        $("#catta-list-selector").on('change', function() {
            viewingSource.id = $(this).val();
            updateCoverUI();
            renderPlaylist();
        });

        // 🔍 ยิง API เพื่อดึงข้อมูลตัวละครมาทำ Playlist
        $("#catta-btn-search-char").on('click', async () => {
            if (!isAuthorized) return;
            const charId = $("#catta-search-char").val().trim();
            if (!charId) return;

            const uid = localStorage.getItem('catta_uid') || localStorage.getItem('dante_uid');
            const token = localStorage.getItem('catta_auth_token') || localStorage.getItem('dante_token');
            const btn = $("#catta-btn-search-char");
            btn.html('<i class="fa-solid fa-spinner fa-spin"></i>');

            try {
                const res = await fetch(`${settings.apiUrl}/v1/music/char_info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ char_id: charId, uid, token })
                });
                const data = await res.json();
                
                if (data.success) {
                    customPlaylists[charId] = { name: data.name, avatar: data.avatar || ICON_URL, tracks: [] };
                    notifyUser(`✅ สร้างเพลย์ลิสต์ของ ${data.name} แล้ว!`);
                } else {
                    customPlaylists[charId] = { name: "Char: " + charId, avatar: ICON_URL, tracks: [] };
                    notifyUser(`⚠️ ไม่พบข้อมูล แต่สร้างเพลย์ลิสต์แยกให้แล้ว`);
                }
            } catch(e) {
                console.error("API Error", e);
                customPlaylists[charId] = { name: charId, avatar: ICON_URL, tracks: [] };
                notifyUser(`❌ เชื่อมต่อล้มเหลว (สร้างเพลย์ลิสต์ออฟไลน์)`);
            }
            
            btn.html('<i class="fa-solid fa-magnifying-glass"></i>');
            $("#catta-search-char").val("");
            viewingSource.id = charId;
            saveData();
            updateListSelector();
            updateCoverUI();
            renderPlaylist();
        });

        // ลบ Playlist
        $("#catta-btn-del-list").on('click', () => {
            if (viewingSource.id === 'default') { alert("❌ ไม่สามารถลบเพลย์ลิสต์เริ่มต้นได้"); return; }
            if (confirm(`ต้องการลบเพลย์ลิสต์ ${customPlaylists[viewingSource.id].name} ใช่หรือไม่?`)) {
                delete customPlaylists[viewingSource.id];
                viewingSource.id = 'default';
                if (playingSource.id === viewingSource.id) playingSource.id = 'default';
                saveData(); updateListSelector(); updateCoverUI(); renderPlaylist();
            }
        });

        $("#catta-btn-save").on('click', () => {
            if (!isAuthorized) return;
            const url = $("#catta-input-url").val().trim();
            if (url) { 
                customPlaylists[viewingSource.id].tracks.push({ name: url.split('/').pop() || "Unknown", url }); 
                $("#catta-input-url").val(""); 
                saveData(); renderPlaylist(); 
            }
        });

        switchTab('user');
        applyTheme(settings.theme);
        makeDraggable(document.getElementById(WIN_ID), '.cattamusic-header');
        
        setInterval(() => { const n = new Date(); $("#catta-time").text(n.getHours().toString().padStart(2, '0') + ":" + n.getMinutes().toString().padStart(2, '0')); }, 1000);
    }

    // ══════════════════════════════════════════════
    // 6. HELPERS & RENDER
    // ══════════════════════════════════════════════
    function updateListSelector() {
        const sel = $("#catta-list-selector");
        sel.empty();
        for (const [id, data] of Object.entries(customPlaylists)) {
            sel.append(`<option value="${id}">${data.name}</option>`);
        }
        sel.val(viewingSource.id);
    }

    function updateCoverUI() {
        // อัปเดตปกตามสิ่งที่กำลังดูอยู่ หรือกำลังเล่นอยู่
        let targetTitle = "รายการส่วนตัว";
        let targetImg = ICON_URL;

        if (playingSource.type === 'char') {
            targetTitle = "🎵 เพลย์ลิสต์ตัวละคร (จากแชท)";
        } else {
            const plist = customPlaylists[playingSource.type === 'user' && isPlaying ? playingSource.id : viewingSource.id];
            if (plist) { targetTitle = plist.name; targetImg = plist.avatar; }
        }
        
        $("#catta-cover-title").text(targetTitle);
        $("#catta-cover-img").attr("src", targetImg);
        if (isPlaying) $("#catta-cover-img").addClass('spinning'); else $("#catta-cover-img").removeClass('spinning');
    }

    function togglePlayerSmart() {
        const win = $(`#${WIN_ID}`);
        if (win.is(':visible')) win.fadeOut(200);
        else { win.css({ top: '10px', left: '50%', transform: 'translateX(-50%)' }); win.fadeIn(200); checkAuth(); }
    }

    function makeDraggable(el, handleSelector, isBubble = false) {
        if (!el) return;
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const handle = el.querySelector(handleSelector) || el;
        const dragStart = (e) => {
            const cx = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const cy = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            pos3 = cx; pos4 = cy;
            document.onmouseup = document.ontouchend = () => {
                document.onmouseup = document.ontouchend = document.onmousemove = document.ontouchmove = null;
                if (isBubble) { settings.posBubble = { top: (el.offsetTop/window.innerHeight*100)+"%", left: (el.offsetLeft/window.innerWidth*100)+"%" }; saveData(); }
            };
            document.onmousemove = document.ontouchmove = (e) => {
                const cx = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
                const cy = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
                pos1 = pos3 - cx; pos2 = pos4 - cy; pos3 = cx; pos4 = cy;
                let nTop = el.offsetTop - pos2, nLeft = el.offsetLeft - pos1;
                const m = 10;
                nLeft = Math.max(m, Math.min(nLeft, window.innerWidth - el.offsetWidth - m));
                nTop = Math.max(m, Math.min(nTop, window.innerHeight - el.offsetHeight - m));
                el.style.top = nTop + "px"; el.style.left = nLeft + "px";
                if (!isBubble) el.style.transform = "none";
            };
        };
        handle.onmousedown = handle.ontouchstart = dragStart;
    }

    function switchTab(tab) {
        viewingSource.type = tab;
        $('.cattamusic-tabs button').removeClass('active');
        $(`#catta-tab-${tab}`).addClass('active');
        $('#catta-playlist-manager').toggle(tab === 'user');
        $('#catta-user-input').toggle(tab === 'user');
        updateCoverUI();
        renderPlaylist();
    }

    function renderPlaylist() {
        const container = $("#catta-list-display");
        if(!container.length) return;
        container.empty();
        
        const list = getViewingArray();
        list.forEach((track, i) => {
            const isActive = (playingSource.type === viewingSource.type && 
                             (viewingSource.type !== 'user' || playingSource.id === viewingSource.id) && 
                             currentTrackIndex === i);
                             
            const item = $(`<div class="playlist-item ${isActive?'active-track':''}"><span>${i+1}. ${track.name}</span>${viewingSource.type === 'user' ? '<span class="del-btn">×</span>' : ''}</div>`);
            item.find('span:first').on('click', () => isAuthorized && playTrack(i, viewingSource.type, viewingSource.id));
            item.find('.del-btn').on('click', (e) => { e.stopPropagation(); list.splice(i, 1); saveData(); renderPlaylist(); });
            container.append(item);
        });
        $("#catta-track-count").text(`${list.length} tracks`);
    }

    function playTrack(i, type, id) {
        playingSource = { type, id };
        const list = getPlayingArray();
        if (i < 0 || i >= list.length) return;
        
        currentTrackIndex = i;
        audioPlayer.src = list[i].url;
        audioPlayer.volume = volume / 5;
        audioPlayer.play().catch(e => console.warn("Auto-play blocked by browser. Click Play to start."));
        isPlaying = true;
        
        $("#catta-btn-play").html('<i class="fa-solid fa-pause"></i>');
        $("#catta-display-name").text(list[i].name);
        
        updateCoverUI();
        renderPlaylist();
        
        // เซ็ตตัวแปร CSS เพื่อให้ Theme UI ทำงานร่วมกับ Inline CSS ได้สมบูรณ์
        document.documentElement.style.setProperty('--catta-main', themes[settings.theme].main);
    }

    function togglePlay() {
        const list = getPlayingArray();
        if (!audioPlayer.src && list.length > 0) return playTrack(0, playingSource.type, playingSource.id);
        if (isPlaying) { audioPlayer.pause(); $("#catta-btn-play").html('<i class="fa-solid fa-play"></i>'); }
        else { audioPlayer.play(); $("#catta-btn-play").html('<i class="fa-solid fa-pause"></i>'); }
        isPlaying = !isPlaying;
        updateCoverUI();
    }

    function playNext() { const l = getPlayingArray(); if(l.length) playTrack((currentTrackIndex+1)%l.length, playingSource.type, playingSource.id); }
    function playPrev() { const l = getPlayingArray(); if(l.length) playTrack((currentTrackIndex-1+l.length)%l.length, playingSource.type, playingSource.id); }
    function changeVolume(v) { volume = Math.min(5, Math.max(1, volume + v)); audioPlayer.volume = volume/5; $("#catta-vol").text(`Vol: ${volume}`); }
    function changeLoopMode() {
        loopMode = (loopMode + 1) % 4;
        const btn = $("#catta-btn-loop");
        const icons = ['arrow-right', 'rotate', 'rotate', 'shuffle'];
        btn.html(`<i class="fa-solid fa-${icons[loopMode]}"></i>${loopMode===2?'<small>1</small>':''}`);
    }

    function applyTheme(themeName) {
        const T = themes[themeName] || themes.orange;
        const win = $(`#${WIN_ID}`);
        if(!win.length) return;
        win.css({ 'border-color': T.main, 'background-color': T.bg, 'color': T.text });
        win.find('.cattamusic-header, .catta-btn-small').css('background-color', T.main);
        win.find('.cattamusic-tabs button').css({ 'border-color': T.main, 'color': T.main });
        win.find('.cattamusic-tabs .active').css({'background-color': T.main, 'color': 'white'});
        win.find('.cattamusic-screen').css({ 'background-color': T.screen, 'border-color': T.main });
        win.find('.cattamusic-controls button').css({ 'border-color': T.main, 'color': T.main });
        document.documentElement.style.setProperty('--catta-main', T.main);
        settings.theme = themeName; saveData();
    }

    function showLockedUI() {
        $(`#${WIN_ID} .cattamusic-controls, #${WIN_ID} .cattamusic-tabs, #${WIN_ID} .cattamusic-playlist`).css({'filter':'blur(4px) grayscale(1)', 'pointer-events':'none'});
        $("#catta-display-name").html("<span style='color:red;'>🔒 LOCK: Please Login Catta Cafe</span>");
        if (isPlaying) { audioPlayer.pause(); isPlaying = false; $("#catta-btn-play").html('<i class="fa-solid fa-play"></i>'); updateCoverUI(); }
    }

    function hideLockedUI() {
        $(`#${WIN_ID} .cattamusic-controls, #${WIN_ID} .cattamusic-tabs, #${WIN_ID} .cattamusic-playlist`).css({'filter':'none', 'pointer-events':'auto'});
    }

    function notifyUser(msg) {
        const marquee = $("#catta-display-name");
        const old = marquee.text();
        marquee.text(msg); setTimeout(() => marquee.text(old), 5000);
    }

    // ══════════════════════════════════════════════
    // 7. INIT
    // ══════════════════════════════════════════════
    $(document).on('visual_update_event', () => { scanLatestChat(); });

    function init() {
        loadData();
        buildSettings();
        if (settings.isEnabled) {
            buildBubble();
            buildPlayerWindow();
            checkAuth();
            setTimeout(scanLatestChat, 1000);
        }
    }

    if (window.jQuery && $("#extensions_settings").length) init();
    else { const iv = setInterval(() => { if (window.jQuery && $("#extensions_settings").length) { clearInterval(iv); init(); } }, 500); }

    audioPlayer.onended = () => {
        if (loopMode === 2) playTrack(currentTrackIndex, playingSource.type, playingSource.id);
        else if (loopMode === 3) { const l = getPlayingArray(); playTrack(Math.floor(Math.random()*l.length), playingSource.type, playingSource.id); }
        else playNext();
    };

})();
