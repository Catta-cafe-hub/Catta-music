/**
 * 🐾 CATTA MUSIC PLAYER — SillyTavern Extension (Full & Stable Version)
 * ═══════════════════════════════════════════════════
 * Developed for Catta-Cafe | Dante Style DOM Observer
 * All features included: Hard-Lock, Dual Mode, Smart Position, No-SSL dependency.
 * + INLINE MUSIC PLAYER & FULL-BANNER CHARACTER PLAYLISTS
 */

(function() {
    "use strict";

    // ══════════════════════════════════════════════
    // 1. CONSTANTS & CONFIG
    // ══════════════════════════════════════════════
    const EXT_ID = "cattamusic";
    const WIN_ID = "cattamusic-player-window";
    const BUBBLE_ID = "cattamusic-bubble";
    const LS_USER_PLAYLISTS = "cattamusic_user_playlists_v2";
    const LS_CHAR_PLAYLISTS = "cattamusic_char_playlists_v2";
    const LS_SETTINGS = "cattamusic_settings";
    const ICON_URL = "https://file.garden/aZx9zS2e7UEiSmfr/cattamusic.png";

    const CHAT_MUSIC_REGEX = /::::\s*\[music\]\s*(.*?)\s*\((https?:\/\/([^\s)]+))\)\s*::::/i;
    const PLAYLIST_BLOCK_REGEX = /\[Catta-music-playlist\s*([\s\S]*?)\]/i;

    let settings = {
        showBubble: true, isEnabled: true, autoMood: true, theme: 'orange', 
        apiUrl: 'https://st-cattacafe.casa/casa_api', 
        posBubble: { top: '80%', left: '10%' }
    };

    // Data Structure แบ่งเป็น 2 ส่วนชัดเจน: ส่วนตัว และ ตัวละคร
    let userPlaylists = {
        "default": { name: "เพลย์ลิสต์ส่วนตัวของฉัน", tracks: [] }
    };
    
    let charPlaylists = {
        "chat": { name: "แชทปัจจุบัน", avatar: ICON_URL, tracks: [] }
    };
    
    // State การแสดงผลและการเล่น
    let viewingTab = 'user'; // 'user' หรือ 'char'
    let viewingId = 'default';
    
    let playingTab = 'user';
    let playingId = 'default';
    let currentTrackIndex = -1;

    let audioPlayer = new Audio();
    let isPlaying = false;
    let volume = 3;
    let loopMode = 0;
    let isAuthorized = false;
    let lastProcessedMsgId = "";

    const themes = {
        orange: { main: '#ff9800', bg: '#fffaf0', screen: '#ffcc80', text: '#333' },
        pink: { main: '#f06292', bg: '#fce4ec', screen: '#f8bbd0', text: '#880e4f' },
        blue: { main: '#2196f3', bg: '#e3f2fd', screen: '#bbdefb', text: '#0d47a1' },
        green: { main: '#4caf50', bg: '#e8f5e9', screen: '#c8e6c9', text: '#1b5e20' },
        purple: { main: '#9c27b0', bg: '#f3e5f5', screen: '#e1bee7', text: '#4a148c' },
        mint: { main: '#00bfa5', bg: '#e0f2f1', screen: '#b2dfdb', text: '#004d40' },
        latte: { main: '#8d6e63', bg: '#efebe9', screen: '#d7ccc8', text: '#3e2723' },
        dark: { main: '#424242', bg: '#212121', screen: '#37474f', text: '#eceff1' },
        midnight: { main: '#1a237e', bg: '#121212', screen: '#1a1a2e', text: '#e8eaf6' },
        blood: { main: '#d32f2f', bg: '#1c1c1c', screen: '#2b2b2b', text: '#ffcdd2' }
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
            
            .catta-manager-row input, .catta-manager-row select {
                background: white !important; color: black !important;
                border: 1px solid #ccc; border-radius: 4px; padding: 4px 6px; font-size: 12px; outline: none;
            }
            .playlist-item {
                display: flex; justify-content: space-between; padding: 5px 8px; margin: 3px 0;
                background: rgba(0,0,0,0.05); border-radius: 4px; font-size: 11px; cursor: pointer;
                transition: 0.2s; color: var(--catta-text, #333);
            }
            .playlist-item:hover { background: rgba(0,0,0,0.1); }
            .playlist-item.active-track {
                background: var(--catta-screen, #ffcc80);
                font-weight: bold; border-left: 3px solid var(--catta-main, #ff9800);
            }
            .playlist-item .del-btn { color: #e53935; cursor: pointer; font-weight: bold; padding: 0 5px; }
            .playlist-item .del-btn:hover { color: #b71c1c; }
        </style>`;
        $('head').append(inlineCSS);
    }

    // ══════════════════════════════════════════════
    // 3. DATA CORE
    // ══════════════════════════════════════════════
    function loadData() {
        const s = localStorage.getItem(LS_SETTINGS);
        if (s) {
            settings = { ...settings, ...JSON.parse(s) };
        }
        
        // บังคับเปลี่ยน localhost เป็น URL จริงแบบเด็ดขาด
        settings.apiUrl = 'https://st-cattacafe.casa/casa_api';
        saveData(); // บันทึกทับลงไปทันที
        
        const up = localStorage.getItem(LS_USER_PLAYLISTS);
        if (up) userPlaylists = JSON.parse(up);
        if (!userPlaylists["default"]) userPlaylists["default"] = { name: "เพลย์ลิสต์ส่วนตัวของฉัน", tracks: [] };

        const cp = localStorage.getItem(LS_CHAR_PLAYLISTS);
        if (cp) charPlaylists = JSON.parse(cp);
        if (!charPlaylists["chat"]) charPlaylists["chat"] = { name: "แชทปัจจุบัน", avatar: ICON_URL, tracks: [] };
    }

    function saveData() {
        localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
        localStorage.setItem(LS_USER_PLAYLISTS, JSON.stringify(userPlaylists));
        localStorage.setItem(LS_CHAR_PLAYLISTS, JSON.stringify(charPlaylists));
    }

    function checkAuth() {
        const uid = localStorage.getItem('catta_uid') || localStorage.getItem('dante_uid');
        const token = localStorage.getItem('catta_auth_token') || localStorage.getItem('dante_token');
        isAuthorized = !!(uid && token);
        if (!isAuthorized) showLockedUI(); else hideLockedUI();
        return isAuthorized;
    }

    function getViewingArray() { 
        return viewingTab === 'user' ? (userPlaylists[viewingId]?.tracks || []) : (charPlaylists[viewingId]?.tracks || []); 
    }
    
    function getPlayingArray() { 
        return playingTab === 'user' ? (userPlaylists[playingId]?.tracks || []) : (charPlaylists[playingId]?.tracks || []); 
    }

    function generateId() { return Math.random().toString(36).substr(2, 9); }

    function getActiveCharInfo() {
        if (window.this_chid !== undefined && window.characters && window.characters[window.this_chid]) {
            const charData = window.characters[window.this_chid];
            return {
                id: window.this_chid.toString(),
                name: charData.name,
                avatar: charData.avatar ? `/characters/${charData.avatar}` : ICON_URL
            };
        }
        return null;
    }

    function addTrackToActiveChar(trackName, trackUrl, mood) {
        let activeChar = getActiveCharInfo();
        let targetId = activeChar ? activeChar.id : 'chat';
        
        if (!charPlaylists[targetId]) {
            charPlaylists[targetId] = { 
                name: activeChar ? activeChar.name : "แชทปัจจุบัน", 
                avatar: activeChar ? activeChar.avatar : ICON_URL, 
                tracks: [] 
            };
        }

        const track = { name: "✨ " + trackName.replace(/^✨\s*/, '').trim(), url: trackUrl.trim(), mood: mood };
        if (!charPlaylists[targetId].tracks.some(t => t.url === track.url)) {
            charPlaylists[targetId].tracks.unshift(track); // ไว้บนสุด
            saveData();
            updateListSelectors();
        }
        return targetId;
    }

    // ══════════════════════════════════════════════
    // 4. SCANNER & INLINE UI (Dante Style)
    // ══════════════════════════════════════════════
    async function scanLatestChat() {
        if (!settings.isEnabled || !isAuthorized) return;

        const chatMessages = document.querySelectorAll('.mes_text');
        if (chatMessages.length === 0) return;

        const latestMsgBox = chatMessages[chatMessages.length - 1];
        const msgId = latestMsgBox.closest('.mes')?.getAttribute('mesid') || latestMsgBox.innerText.substring(0, 30);
        
        const originalText = latestMsgBox.innerText;

        // วาด UI ปุ่ม Music ทับข้อความดิบ (Single Track)
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

        // A. Single Song Trigger (เล่นออโต้ + เข้าเพลย์ลิสต์ตัวละคร)
        const musicMatch = originalText.match(CHAT_MUSIC_REGEX);
        if (musicMatch) {
            let targetId = addTrackToActiveChar(musicMatch[1], musicMatch[2], "shared");
            
            // เด้งหน้าต่างขึ้นมา
            const win = $(`#${WIN_ID}`);
            if (!win.is(':visible') && settings.showBubble) {
                win.css({ top: '10px', left: '50%', transform: 'translateX(-50%)' });
                win.fadeIn(200);
            }
            
            switchTab('char', targetId);
            playTrack(charPlaylists[targetId].tracks.findIndex(t => t.url === musicMatch[2].trim()), 'char', targetId);
            notifyUser("🎵 เล่นเพลงอัตโนมัติจากแชท!");
            return;
        }

        // 🕵️‍♂️ แอบดึงข้อมูลความลับของตัวละครจาก SillyTavern (Description, Personality, Scenario)
        let sourceText = "";
        try {
            if (window.characters && window.this_chid !== undefined && window.characters[window.this_chid]) {
                const charData = window.characters[window.this_chid];
                sourceText = [charData.description, charData.personality, charData.scenario, charData.first_mes].join('\\n\\n');
            }
        } catch (e) {
            console.warn("CattaMusic: ไม่สามารถเข้าถึงข้อมูลตัวละครได้", e);
        }

        const uid = localStorage.getItem('catta_uid') || localStorage.getItem('dante_uid');
        const token = localStorage.getItem('catta_auth_token') || localStorage.getItem('dante_token');

        // 🧠 ยิงให้ Casa (VPS) เป็นสมองประมวลผล (ดึงเพลย์ลิสต์ลับ + วิเคราะห์อารมณ์)
        console.log("[CattaMusic] 🚀 Sending POST to Casa Scan API:", `${settings.apiUrl}/v1/music/scan`);
        console.log("[CattaMusic] 📦 Payload:", { uid, token: token ? "HAS_TOKEN" : "NO_TOKEN", source_text_length: sourceText.length, chat_text_length: originalText.length });
        
        try {
            const res = await fetch(`${settings.apiUrl}/v1/music/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    uid: uid, 
                    token: token,
                    source_text: sourceText,
                    chat_text: originalText 
                })
            });
            
            console.log("[CattaMusic] 📥 Scan Response Status:", res.status);
            const data = await res.json();
            console.log("[CattaMusic] 📄 Scan Response Data:", data);

            if (data.success) {
                let activeChar = getActiveCharInfo();
                let targetId = activeChar ? activeChar.id : 'chat';
                
                if (!charPlaylists[targetId]) {
                    charPlaylists[targetId] = { name: activeChar ? activeChar.name : "แชทปัจจุบัน", avatar: activeChar ? activeChar.avatar : ICON_URL, tracks: [] };
                }

                let hasNewTracks = false;

                // 1. จัดการ Playlist ที่ Casa แกะมาให้
                if (data.playlist && data.playlist.length > 0) {
                    data.playlist.forEach(track => {
                        if (!charPlaylists[targetId].tracks.some(t => t.url === track.url)) {
                            if (track.name.startsWith('✨')) {
                                charPlaylists[targetId].tracks.unshift(track); // เพลงแชทให้อยู่บนสุด
                            } else {
                                charPlaylists[targetId].tracks.push(track);
                            }
                            hasNewTracks = true;
                        }
                    });
                }

                if (hasNewTracks) {
                    saveData();
                    updateListSelectors();
                    if (viewingTab === 'char' && viewingId === targetId) renderPlaylist();
                }

                // 2. รับคำสั่งเล่นเพลงอัตโนมัติ (Mood Sync) จาก Casa
                if (settings.autoMood && data.auto_play_track) {
                    const trackToPlay = charPlaylists[targetId].tracks.findIndex(t => t.url === data.auto_play_track.url);
                    if (trackToPlay !== -1) {
                        playTrack(trackToPlay, 'char', targetId);
                        notifyUser("🎭 เปลี่ยนเพลงตามอารมณ์ฉาก!");
                    }
                }
            }
        } catch (e) {
            console.error("CattaMusic API Error (Casa Scan):", e);
        }
    }

    // Global Click Handler สำหรับ Inline Player
    $(document).off('click', '.catta-inline-music').on('click', '.catta-inline-music', function() {
        if (!isAuthorized) { alert("🔒 โปรดเข้าสู่ระบบ Catta Cafe"); return; }
        const url = $(this).data('url');
        const name = $(this).data('name');
        
        let targetId = addTrackToActiveChar(name, url, "shared");
        
        const win = $(`#${WIN_ID}`);
        if (!win.is(':visible')) {
            win.css({ top: '10px', left: '50%', transform: 'translateX(-50%)' });
            win.fadeIn(200);
        }
        
        switchTab('char', targetId);
        playTrack(charPlaylists[targetId].tracks.findIndex(t => t.url === url), 'char', targetId);
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
                <div style="margin-top:10px;"><label>สีธีม:</label><div class="theme-selectors">${Object.keys(themes).map(t=>`<div class="theme-dot" data-theme="${t}" style="background:${themes[t].main}"></div>`).join('')}</div></div>
            </div>`;
        $('#extensions_settings').append(html);
        $('#catta-cfg-enabled').on('change', function() { settings.isEnabled = this.checked; saveData(); location.reload(); });
        $('#catta-cfg-bubble').on('change', function() { settings.showBubble = this.checked; $(`#${BUBBLE_ID}`).toggle(settings.showBubble); saveData(); });
        $('#catta-cfg-mood').on('change', function() { settings.autoMood = this.checked; saveData(); });
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
        
        // รูปแบบมินิมอล (Compact Style) เปลี่ยนสีตาม Theme (ทิ้ง hardcode สีดำ)
        const html = `
            <div id="${WIN_ID}" style="display: none; position: fixed; z-index: 10000; top: 10px; left: 50%; transform: translateX(-50%); width: 280px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); border-radius: 12px; overflow: hidden; border: 2px solid var(--catta-main, #ff9800); background: var(--catta-bg, #fffaf0); color: var(--catta-text, #333);">
                <div class="cattamusic-header" style="padding: 5px 10px; font-size: 12px; font-weight: bold; background: var(--catta-main, #ff9800); color: white; display: flex; justify-content: space-between; align-items: center; cursor: grab;">
                    <span>🐾 Catta Music</span><button id="catta-close-win" style="background: none; border: none; color: white; font-size: 16px; cursor: pointer; padding: 0;">×</button>
                </div>
                
                <div id="catta-banner-container" style="width: 100%; padding: 10px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(128,128,128,0.2);">
                    <img id="catta-cover-img" src="${ICON_URL}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                    <div style="flex-grow: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center;">
                        <div id="catta-cover-title" style="font-size: 14px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">Catta Music</div>
                        <div id="catta-display-name" class="cattamusic-marquee" style="color: var(--catta-main, #ff9800); font-size: 11px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Ready to play!</div>
                    </div>
                </div>

                <div class="cattamusic-screen" style="border: none; padding: 4px 10px; background: var(--catta-screen, #ffcc80); font-size: 10px; font-weight: bold;">
                    <div class="cattamusic-status-bar" style="display: flex; justify-content: space-between;"><span id="catta-time">00:00</span><span id="catta-vol">Vol: 3</span><span id="catta-track-count">0 tracks</span></div>
                </div>
                
                <div class="cattamusic-controls" style="padding: 8px; display: flex; justify-content: space-around; border-bottom: 1px solid rgba(128,128,128,0.2);">
                    <button id="catta-btn-loop" style="background:none; border:none; cursor:pointer;"><i class="fa-solid fa-arrow-right" title="เล่นต่อ"></i></button>
                    <button id="catta-btn-prev" style="background:none; border:none; cursor:pointer;"><i class="fa-solid fa-backward-step"></i></button>
                    <button id="catta-btn-play" style="background:var(--catta-main, #ff9800); border:none; color:white; width:30px; height:30px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><i class="fa-solid fa-play"></i></button>
                    <button id="catta-btn-next" style="background:none; border:none; cursor:pointer;"><i class="fa-solid fa-forward-step"></i></button>
                    <button id="catta-btn-voldown" style="background:none; border:none; cursor:pointer;"><i class="fa-solid fa-volume-low"></i></button>
                    <button id="catta-btn-volup" style="background:none; border:none; cursor:pointer;"><i class="fa-solid fa-volume-high"></i></button>
                </div>
                
                <div class="cattamusic-tabs" style="display: flex; border-bottom: 1px solid rgba(128,128,128,0.2);">
                    <button id="catta-tab-user" style="flex:1; padding: 6px; background:none; border:none; font-weight:bold; cursor:pointer; font-size:12px; transition:0.2s;">👤 ส่วนตัว</button>
                    <button id="catta-tab-char" style="flex:1; padding: 6px; background:none; border:none; font-weight:bold; cursor:pointer; font-size:12px; transition:0.2s;">🐱 ตัวละคร</button>
                    <button id="catta-btn-toggle-tools" style="background:none; border:none; color:var(--catta-main, #ff9800); cursor:pointer; padding: 0 12px; font-size:14px; border-left: 1px solid rgba(128,128,128,0.2); transition:0.2s;" title="เครื่องมือจัดการเพลย์ลิสต์"><i class="fa-solid fa-sliders"></i></button>
                </div>
                
                <div class="cattamusic-playlist" style="background: var(--catta-bg, #fffaf0);">
                    <!-- Tools Container (ซ่อน/แสดงได้) -->
                    <div id="catta-tools-container" style="display: none; background: rgba(0,0,0,0.03); border-bottom: 1px solid rgba(128,128,128,0.2);">
                        <!-- User Playlist Manager -->
                        <div id="catta-user-manager" class="catta-manager-row" style="display:none; padding:8px; flex-direction:column; gap:5px;">
                            <div style="display:flex; gap:5px;">
                                <select id="catta-user-sel" style="flex-grow:1; background:rgba(255,255,255,0.7)!important; border:1px solid rgba(128,128,128,0.4); padding:3px 5px; font-size:11px;"></select>
                                <button id="catta-btn-del-user" class="catta-btn-small" style="background:#e53935; border:none; color:white; padding:2px 6px; border-radius:3px;" title="ลบรายการนี้"><i class="fa-solid fa-trash"></i></button>
                            </div>
                            <div style="display:flex; gap:5px;">
                                <input type="text" id="catta-new-user-name" placeholder="ตั้งชื่อรายการส่วนตัวใหม่" style="flex-grow:1; background:rgba(255,255,255,0.7)!important; border:1px solid rgba(128,128,128,0.4); padding:3px 5px; font-size:11px;">
                                <button id="catta-btn-new-user" class="catta-btn-small" style="background:#4caf50; border:none; color:white; padding:2px 6px; border-radius:3px;">สร้าง</button>
                            </div>
                        </div>

                        <!-- Char Playlist Manager -->
                        <div id="catta-char-manager" class="catta-manager-row" style="display:none; padding:8px; flex-direction:column; gap:5px;">
                            <div style="display:flex; gap:5px;">
                                <select id="catta-char-sel" style="flex-grow:1; background:rgba(255,255,255,0.7)!important; border:1px solid rgba(128,128,128,0.4); padding:3px 5px; font-size:11px;"></select>
                                <button id="catta-btn-del-char" class="catta-btn-small" style="background:#e53935; border:none; color:white; padding:2px 6px; border-radius:3px;" title="ลบรายการตัวละครนี้"><i class="fa-solid fa-trash"></i></button>
                            </div>
                            <div style="display:flex; gap:5px;">
                                <input type="text" id="catta-search-char" placeholder="ID/ชื่อ ตัวละคร" style="flex-grow:1; background:rgba(255,255,255,0.7)!important; border:1px solid rgba(128,128,128,0.4); padding:3px 5px; font-size:11px;">
                                <button id="catta-btn-search-char" class="catta-btn-small" style="background:#2196f3; border:none; color:white; padding:2px 6px; border-radius:3px;"><i class="fa-solid fa-search"></i> ค้นหา</button>
                            </div>
                            <div id="catta-char-search-results" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                                <select id="catta-char-result-sel" style="flex-grow:1; background:rgba(255,255,255,0.7)!important; border:1px solid rgba(128,128,128,0.4); padding:3px 5px; font-size:11px;"></select>
                                <button id="catta-btn-confirm-char" class="catta-btn-small" style="background:#4caf50; border:none; color:white; padding:2px 6px; border-radius:3px; width:100%;">เพิ่มตัวละครนี้</button>
                            </div>
                        </div>

                        <div id="catta-add-url-box" style="display:flex; gap:5px; padding:0 8px 8px 8px;">
                            <input type="text" id="catta-input-url" placeholder="วางลิ้งค์ .mp3 เพื่อเพิ่มเข้าเพลย์ลิสต์นี้..." style="flex-grow:1; font-size:11px; padding:3px 5px; background:rgba(255,255,255,0.7)!important; border:1px solid rgba(128,128,128,0.4); border-radius:3px;">
                            <button id="catta-btn-save" class="catta-btn-small" style="background:var(--catta-main, #ff9800); border:none; color:white; padding:3px 8px; border-radius:3px;">+ Add</button>
                        </div>
                    </div>
                    
                    <div id="catta-list-display" class="catta-scroll-list" style="max-height: 150px; overflow-y: auto; padding: 8px;"></div>
                </div>
            </div>`;
        $("body").append(html);
        
        // Buttons
        $('#catta-tab-user').on('click', () => switchTab('user'));
        $('#catta-tab-char').on('click', () => switchTab('char'));
        
        let isToolsOpen = false;
        $("#catta-btn-toggle-tools").on('click', function() {
            isToolsOpen = !isToolsOpen;
            if(isToolsOpen) {
                $("#catta-tools-container").slideDown(200);
                $(this).css('color', 'var(--catta-text, #333)');
                $(this).css('background', 'rgba(128,128,128,0.1)');
            } else {
                $("#catta-tools-container").slideUp(200);
                $(this).css('color', 'var(--catta-main, #ff9800)');
                $(this).css('background', 'none');
            }
        });

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

        // -- USER MANAGER --
        $("#catta-user-sel").on('change', function() { viewingId = $(this).val(); updateCoverUI(); renderPlaylist(); });
        
        $("#catta-btn-new-user").on('click', () => {
            const n = $("#catta-new-user-name").val().trim();
            if (!n) return;
            const nid = "u_" + generateId();
            userPlaylists[nid] = { name: n, tracks: [] };
            $("#catta-new-user-name").val("");
            saveData(); viewingId = nid; updateListSelectors(); updateCoverUI(); renderPlaylist();
        });

        $("#catta-btn-del-user").on('click', () => {
            if (viewingId === 'default') { alert("❌ ลบรายการส่วนตัวเริ่มต้นไม่ได้ครับ"); return; }
            if (confirm(`ลบเพลย์ลิสต์ "${userPlaylists[viewingId].name}" ใช่ไหม?`)) {
                delete userPlaylists[viewingId];
                viewingId = 'default';
                if(playingTab === 'user' && playingId === viewingId) playingId = 'default';
                saveData(); updateListSelectors(); updateCoverUI(); renderPlaylist();
            }
        });

        // -- CHAR MANAGER --
        $("#catta-char-sel").on('change', function() { viewingId = $(this).val(); updateCoverUI(); renderPlaylist(); });

        let currentSearchResults = [];

        $("#catta-btn-search-char").on('click', async () => {
            if (!isAuthorized) { alert("🔒 เข้าสู่ระบบก่อนครับ"); return; }
            const charId = $("#catta-search-char").val().trim();
            if (!charId) return;

            const uid = localStorage.getItem('catta_uid') || localStorage.getItem('dante_uid');
            const token = localStorage.getItem('catta_auth_token') || localStorage.getItem('dante_token');
            const btn = $("#catta-btn-search-char");
            const oldHtml = btn.html();
            btn.html('<i class="fa-solid fa-spinner fa-spin"></i>');
            $("#catta-char-search-results").hide();

            console.log("[CattaMusic] 🚀 Sending POST to Casa Char Info API:", `${settings.apiUrl}/v1/music/char_info`);
            console.log("[CattaMusic] 📦 Payload:", { char_id: charId, uid, token: token ? "HAS_TOKEN" : "NO_TOKEN" });

            try {
                const res = await fetch(`${settings.apiUrl}/v1/music/char_info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ char_id: charId, uid, token })
                });
                
                console.log("[CattaMusic] 📥 Char Info Response Status:", res.status);
                const data = await res.json();
                console.log("[CattaMusic] 📄 Char Info Response Data:", data);
                
                if (data.success && data.results && data.results.length > 0) {
                    currentSearchResults = data.results;
                    const sel = $("#catta-char-result-sel").empty();
                    data.results.forEach((c, idx) => {
                        sel.append(`<option value="${idx}">${c.name}</option>`);
                    });
                    $("#catta-char-search-results").css('display', 'flex');
                    notifyUser(`✅ พบ ${data.results.length} ตัวละคร!`);
                } else {
                    notifyUser(`⚠️ ไม่พบข้อมูลตัวละครนี้`);
                }
            } catch(e) {
                console.error("API Error", e);
                notifyUser(`❌ เชื่อมต่อล้มเหลว`);
            }
            
            btn.html(oldHtml);
        });

        $("#catta-btn-confirm-char").on('click', () => {
            const idx = $("#catta-char-result-sel").val();
            if (idx === null || !currentSearchResults[idx]) return;
            
            const selectedChar = currentSearchResults[idx];
            charPlaylists[selectedChar.id] = { name: selectedChar.name, avatar: selectedChar.avatar || ICON_URL, tracks: [] };
            
            $("#catta-char-search-results").hide();
            $("#catta-search-char").val("");
            viewingId = selectedChar.id;
            saveData(); updateListSelectors(); updateCoverUI(); renderPlaylist();
            notifyUser(`✅ เพิ่มเพลย์ลิสต์ของ ${selectedChar.name} แล้ว!`);
        });

        $("#catta-btn-del-char").on('click', () => {
            if (viewingId === 'chat') { alert("❌ ลบรายการ 'เพลงจากแชท' ไม่ได้ครับ"); return; }
            if (confirm(`ลบเพลย์ลิสต์ตัวละคร "${charPlaylists[viewingId].name}" ใช่ไหม?`)) {
                delete charPlaylists[viewingId];
                viewingId = 'chat';
                if(playingTab === 'char' && playingId === viewingId) playingId = 'chat';
                saveData(); updateListSelectors(); updateCoverUI(); renderPlaylist();
            }
        });

        // Add URL
        $("#catta-btn-save").on('click', () => {
            if (!isAuthorized) return;
            const url = $("#catta-input-url").val().trim();
            if (url) { 
                let listObj = viewingTab === 'user' ? userPlaylists : charPlaylists;
                listObj[viewingId].tracks.push({ name: url.split('/').pop() || "Unknown", url }); 
                $("#catta-input-url").val(""); 
                saveData(); renderPlaylist(); 
            }
        });

        updateListSelectors();
        switchTab('user');
        applyTheme(settings.theme);
        makeDraggable(document.getElementById(WIN_ID), '.cattamusic-header');
        
        setInterval(() => { const n = new Date(); $("#catta-time").text(n.getHours().toString().padStart(2, '0') + ":" + n.getMinutes().toString().padStart(2, '0')); }, 1000);
    }

    // ══════════════════════════════════════════════
    // 6. HELPERS & RENDER
    // ══════════════════════════════════════════════
    function updateListSelectors() {
        const uSel = $("#catta-user-sel").empty();
        for (const [id, data] of Object.entries(userPlaylists)) uSel.append(`<option value="${id}">${data.name}</option>`);
        uSel.val(viewingTab === 'user' ? viewingId : 'default');

        const cSel = $("#catta-char-sel").empty();
        for (const [id, data] of Object.entries(charPlaylists)) cSel.append(`<option value="${id}">${data.name}</option>`);
        cSel.val(viewingTab === 'char' ? viewingId : 'chat');
    }

    function updateCoverUI() {
        let title = "Catta Music";
        let img = ICON_URL;

        // ถ้าเล่นอยู่ ให้โชว์ปกของอันที่กำลังเล่นเป็นหลัก
        let targetTab = isPlaying ? playingTab : viewingTab;
        let targetId = isPlaying ? playingId : viewingId;

        if (targetTab === 'user') {
            const p = userPlaylists[targetId];
            if (p) title = p.name;
        } else {
            const p = charPlaylists[targetId];
            if (p) { title = p.name; img = p.avatar; }
        }
        
        $("#catta-cover-title").text(title);
        $("#catta-cover-img").attr("src", img);
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

    function switchTab(tab, forceId = null) {
        viewingTab = tab;
        if (forceId) {
            viewingId = forceId;
        } else {
            // คืนค่า viewingId กลับไปที่ของเดิมในแท็บนั้น
            viewingId = tab === 'user' ? $("#catta-user-sel").val() : $("#catta-char-sel").val();
        }
        
        $('.cattamusic-tabs button').removeClass('active');
        $(`#catta-tab-${tab}`).addClass('active');
        
        $('#catta-user-manager').toggle(tab === 'user');
        $('#catta-char-manager').toggle(tab === 'char');
        
        updateListSelectors();
        updateCoverUI();
        renderPlaylist();
    }

    function renderPlaylist() {
        const container = $("#catta-list-display");
        if(!container.length) return;
        container.empty();
        
        const list = getViewingArray();
        list.forEach((track, i) => {
            const isActive = (playingTab === viewingTab && playingId === viewingId && currentTrackIndex === i);
            const item = $(`<div class="playlist-item ${isActive?'active-track':''}"><span>${i+1}. ${track.name}</span><span class="del-btn">×</span></div>`);
            item.find('span:first').on('click', () => isAuthorized && playTrack(i, viewingTab, viewingId));
            item.find('.del-btn').on('click', (e) => { e.stopPropagation(); list.splice(i, 1); saveData(); renderPlaylist(); });
            container.append(item);
        });
        $("#catta-track-count").text(`${list.length} tracks`);
    }

    function playTrack(i, tab, id) {
        playingTab = tab;
        playingId = id;
        
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
        
        document.documentElement.style.setProperty('--catta-main', themes[settings.theme].main);
    }

    function togglePlay() {
        const list = getPlayingArray();
        if (!audioPlayer.src && list.length > 0) return playTrack(0, playingTab, playingId);
        if (isPlaying) { audioPlayer.pause(); $("#catta-btn-play").html('<i class="fa-solid fa-play"></i>'); }
        else { audioPlayer.play(); $("#catta-btn-play").html('<i class="fa-solid fa-pause"></i>'); }
        isPlaying = !isPlaying;
        updateCoverUI();
    }

    function playNext() { const l = getPlayingArray(); if(l.length) playTrack((currentTrackIndex+1)%l.length, playingTab, playingId); }
    function playPrev() { const l = getPlayingArray(); if(l.length) playTrack((currentTrackIndex-1+l.length)%l.length, playingTab, playingId); }
    function changeVolume(v) { volume = Math.min(5, Math.max(1, volume + v)); audioPlayer.volume = volume/5; $("#catta-vol").text(`Vol: ${volume}`); }
    function changeLoopMode() {
        loopMode = (loopMode + 1) % 4;
        const btn = $("#catta-btn-loop");
        if (loopMode === 0) btn.html('<i class="fa-solid fa-arrow-right" title="เล่นต่อ"></i>');
        else if (loopMode === 1) btn.html('<i class="fa-solid fa-repeat" title="วนลูปทั้งหมด"></i>');
        else if (loopMode === 2) btn.html('<div style="position:relative; display:inline-block;" title="วนลูปเพลงเดียว"><i class="fa-solid fa-repeat"></i><span style="position:absolute; top:-2px; right:-6px; font-size:9px; font-weight:900; background:var(--catta-main, #ff9800); color:#fff; border-radius:50%; padding:0 3px;">1</span></div>');
        else if (loopMode === 3) btn.html('<i class="fa-solid fa-shuffle" title="สุ่มเพลง"></i>');
    }

    function applyTheme(themeName) {
        const T = themes[themeName] || themes.orange;
        const win = $(`#${WIN_ID}`);
        if(!win.length) return;
        
        document.documentElement.style.setProperty('--catta-main', T.main);
        document.documentElement.style.setProperty('--catta-bg', T.bg);
        document.documentElement.style.setProperty('--catta-screen', T.screen);
        document.documentElement.style.setProperty('--catta-text', T.text);

        win.css({ 'border-color': T.main, 'background-color': T.bg, 'color': T.text });
        win.find('.cattamusic-header, .catta-btn-small[id="catta-btn-save"]').css({'background-color': T.main, 'color': '#fff'});
        
        win.find('.cattamusic-tabs button').css({ 'color': T.text });
        win.find('.cattamusic-tabs .active').css({'background-color': T.main, 'color': '#fff'});
        
        win.find('.cattamusic-screen').css({ 'background-color': T.screen, 'color': T.text });
        win.find('.cattamusic-controls button').css({ 'color': T.text });
        win.find('#catta-btn-play').css({'background-color': T.main, 'color': '#fff'});
        
        const toolsBtn = win.find('#catta-btn-toggle-tools');
        if (toolsBtn.css('background-color') === 'rgba(0, 0, 0, 0)') { // if closed
            toolsBtn.css('color', T.main);
        } else {
            toolsBtn.css('color', T.text);
        }

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
        if (loopMode === 2) playTrack(currentTrackIndex, playingTab, playingId);
        else if (loopMode === 3) { const l = getPlayingArray(); playTrack(Math.floor(Math.random()*l.length), playingTab, playingId); }
        else playNext();
    };

})();
