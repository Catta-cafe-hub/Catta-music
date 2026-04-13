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
        apiUrl: 'http://localhost:2096', 
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
            
            .catta-manager-row input, .catta-manager-row select {
                background: white !important; color: black !important;
                border: 1px solid #ccc; border-radius: 4px; padding: 4px 6px; font-size: 12px; outline: none;
            }
        </style>`;
        $('head').append(inlineCSS);
    }

    // ══════════════════════════════════════════════
    // 3. DATA CORE
    // ══════════════════════════════════════════════
    function loadData() {
        const s = localStorage.getItem(LS_SETTINGS);
        if (s) settings = { ...settings, ...JSON.parse(s) };
        
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
            const data = await res.json();

            if (data.success) {
                let targetId = viewingTab === 'char' ? viewingId : 'chat';
                if (!charPlaylists[targetId]) targetId = 'chat';

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
                    if (viewingTab === 'char' && viewingId === targetId) renderPlaylist();
                }

                // 2. รับคำสั่งเล่นเพลงอัตโนมัติ (Mood Sync) จาก Casa
                if (settings.autoMood && data.auto_play_track) {
                    const trackToPlay = charPlaylists[targetId].tracks.findIndex(t => t.url === data.auto_play_track.url);
                    if (trackToPlay !== -1) {
                        playTrack(trackToPlay, 'char', targetId);
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
        
        let targetId = viewingTab === 'char' ? viewingId : 'chat';
        if (!charPlaylists[targetId]) targetId = 'chat';
        
        if (!charPlaylists[targetId].tracks.some(t => t.url === url)) {
            charPlaylists[targetId].tracks.unshift({ name: "✨ " + name, url: url, mood: "shared" });
            saveData();
        }
        
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
        
        // รูปแบบปกเต็ม (Banner Style) ไม่มีจานหมุนๆ
        const html = `
            <div id="${WIN_ID}" style="display: none; position: fixed; z-index: 10000; top: 10px; left: 50%; transform: translateX(-50%); width: 320px;">
                <div class="cattamusic-header" style="position: absolute; top: 0; left: 0; width: 100%; z-index: 2; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);">
                    <span>🐾 Catta Music</span><button id="catta-close-win">×</button>
                </div>
                
                <div id="catta-banner-container" style="width: 100%; height: 160px; background-color: #111; background-image: url('${ICON_URL}'); background-size: cover; background-position: top center; position: relative; border-bottom: 2px solid var(--catta-main); transition: background-image 0.4s ease;">
                    <div style="position: absolute; bottom: 0; left: 0; width: 100%; background: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6), transparent); padding: 25px 15px 10px 15px; box-sizing: border-box;">
                        <div id="catta-cover-title" style="color: #fff; font-size: 16px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Catta Music</div>
                        <div id="catta-display-name" class="cattamusic-marquee" style="color: #ddd; font-size: 12px; margin-top: 4px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Ready to play!</div>
                    </div>
                </div>

                <div class="cattamusic-screen" style="border-top:none; border-radius: 0;">
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
                    <!-- User Playlist Manager -->
                    <div id="catta-user-manager" class="catta-manager-row" style="display:none; padding:8px 10px; background:rgba(0,0,0,0.05); flex-direction:column; gap:5px;">
                        <div style="display:flex; gap:5px;">
                            <select id="catta-user-sel" style="flex-grow:1;"></select>
                            <button id="catta-btn-del-user" class="catta-btn-small" style="background:#e53935; padding:4px 8px;" title="ลบรายการนี้"><i class="fa-solid fa-trash"></i></button>
                        </div>
                        <div style="display:flex; gap:5px;">
                            <input type="text" id="catta-new-user-name" placeholder="ตั้งชื่อรายการส่วนตัวใหม่" style="flex-grow:1;">
                            <button id="catta-btn-new-user" class="catta-btn-small" style="padding:4px 8px;">สร้าง</button>
                        </div>
                    </div>

                    <!-- Char Playlist Manager -->
                    <div id="catta-char-manager" class="catta-manager-row" style="display:none; padding:8px 10px; background:rgba(0,0,0,0.05); flex-direction:column; gap:5px;">
                        <div style="display:flex; gap:5px;">
                            <select id="catta-char-sel" style="flex-grow:1;"></select>
                            <button id="catta-btn-del-char" class="catta-btn-small" style="background:#e53935; padding:4px 8px;" title="ลบรายการตัวละครนี้"><i class="fa-solid fa-trash"></i></button>
                        </div>
                        <div style="display:flex; gap:5px;">
                            <input type="text" id="catta-search-char" placeholder="ID/ชื่อ ตัวละคร" style="flex-grow:1;">
                            <button id="catta-btn-search-char" class="catta-btn-small" style="padding:4px 8px;"><i class="fa-solid fa-cloud-arrow-down"></i> ค้นหา</button>
                        </div>
                        <div id="catta-char-search-results" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                            <select id="catta-char-result-sel" style="flex-grow:1;"></select>
                            <button id="catta-btn-confirm-char" class="catta-btn-small" style="padding:4px 8px; width:100%;">เพิ่มตัวละครนี้</button>
                        </div>
                    </div>

                    <div id="catta-add-url-box" style="display:flex; gap:5px; padding:5px 10px;">
                        <input type="text" id="catta-input-url" placeholder="วางลิ้งค์ .mp3 เพื่อเพิ่มเข้าเพลย์ลิสต์นี้..." style="flex-grow:1; font-size:11px; padding:4px;">
                        <button id="catta-btn-save" class="catta-btn-small" style="padding:4px 8px;">+ Add</button>
                    </div>
                    
                    <div id="catta-list-display" class="catta-scroll-list"></div>
                </div>
            </div>`;
        $("body").append(html);
        
        // Buttons
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

            try {
                const res = await fetch(`${settings.apiUrl}/v1/music/char_info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ char_id: charId, uid, token })
                });
                const data = await res.json();
                
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
        $("#catta-banner-container").css("background-image", `url('${img}')`);
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
        if (loopMode === 2) playTrack(currentTrackIndex, playingTab, playingId);
        else if (loopMode === 3) { const l = getPlayingArray(); playTrack(Math.floor(Math.random()*l.length), playingTab, playingId); }
        else playNext();
    };

})();
