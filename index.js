/**
 * 🐾 CATTA MUSIC PLAYER — SillyTavern Extension (Ultra Minimal Update)
 * ═══════════════════════════════════════════════════
 * Developed for Catta-Cafe | Dante Style DOM Observer
 */

(function() {
    "use strict";

    const EXT_ID = "cattamusic";
    const WIN_ID = "cattamusic-player-window";
    const BUBBLE_ID = "cattamusic-bubble";
    const LS_USER_PLAYLISTS = "cattamusic_user_playlists_v2";
    const LS_CHAR_PLAYLISTS = "cattamusic_char_playlists_v2";
    const LS_SETTINGS = "cattamusic_settings";
    const ICON_URL = "https://file.garden/aZx9zS2e7UEiSmfr/cattamusic.png";

    const CHAT_MUSIC_REGEX = /::::\s*\[music\]\s*(.*?)\s*\((https?:\/\/([^\s)]+))\)\s*::::/i;

    let settings = {
        showBubble: true, isEnabled: true, autoMood: true, theme: 'orange', 
        apiUrl: 'https://st-cattacafe.casa/casa_api', 
        posBubble: { top: '80%', left: '10%' }
    };

    let userPlaylists = {
        "default": { name: "เพลย์ลิสต์ส่วนตัวของฉัน", avatar: ICON_URL, tracks: [] }
    };
    
    let charPlaylists = {
        "chat": { name: "Unknown", avatar: ICON_URL, tracks: [] }
    };
    
    let viewingTab = 'user'; 
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
    let isToggling = false; // ป้องกันการกดรัว

    const themes = {
        pink:     { main:'#ff6b9d', accent:'#ff9a56', dark:'#1a0a2e', card:'#2d1b54', text:'#f0e8ff', muted:'#b08ecf', glow:'rgba(255,107,157,0.4)' },
        orange:   { main:'#ff9a56', accent:'#ffd93d', dark:'#1f0e00', card:'#2e1a00', text:'#fff0e0', muted:'#c4956b', glow:'rgba(255,154,86,0.4)' },
        blue:     { main:'#4d96ff', accent:'#6bcb77', dark:'#050f2e', card:'#0d1f5c', text:'#e8f0ff', muted:'#7a9fd4', glow:'rgba(77,150,255,0.4)' },
        mint:     { main:'#6bcb77', accent:'#4d96ff', dark:'#041a0a', card:'#082e14', text:'#e8ffe8', muted:'#7cb882', glow:'rgba(107,203,119,0.4)' }
    };

    function loadData() {
        const s = localStorage.getItem(LS_SETTINGS);
        if (s) settings = { ...settings, ...JSON.parse(s) };
        settings.apiUrl = 'https://st-cattacafe.casa/casa_api';
        
        const up = localStorage.getItem(LS_USER_PLAYLISTS);
        if (up) userPlaylists = JSON.parse(up);
        if (!userPlaylists["default"]) userPlaylists["default"] = { name: "เพลย์ลิสต์ส่วนตัว", avatar: ICON_URL, tracks: [] };

        const cp = localStorage.getItem(LS_CHAR_PLAYLISTS);
        if (cp) charPlaylists = JSON.parse(cp);
        if (!charPlaylists["chat"]) charPlaylists["chat"] = { name: "Unknown", avatar: ICON_URL, tracks: [] };
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
        return isAuthorized;
    }

    function getViewingArray() { return viewingTab === 'user' ? (userPlaylists[viewingId]?.tracks || []) : (charPlaylists[viewingId]?.tracks || []); }
    function getPlayingArray() { return playingTab === 'user' ? (userPlaylists[playingId]?.tracks || []) : (charPlaylists[playingId]?.tracks || []); }
    function generateId() { return Math.random().toString(36).substr(2, 9); }

    function getActiveCharInfo() {
        if (window.this_chid !== undefined && window.characters && window.characters[window.this_chid]) {
            const charData = window.characters[window.this_chid];
            return {
                id: window.this_chid.toString(),
                name: charData.name || "Unknown",
                avatar: charData.avatar ? `/characters/${charData.avatar}` : ICON_URL
            };
        }
        return null;
    }

    function addTrackToActiveChar(trackName, trackUrl, mood) {
        let activeChar = getActiveCharInfo();
        let targetId = activeChar ? activeChar.id : 'chat';
        let charName = activeChar ? activeChar.name : "Unknown";
        
        if (!charPlaylists[targetId]) {
            charPlaylists[targetId] = { name: charName, avatar: activeChar ? activeChar.avatar : ICON_URL, tracks: [] };
        }

        const track = { name: "✨ " + trackName.replace(/^✨\s*/, '').trim(), url: trackUrl.trim(), mood: mood };
        if (!charPlaylists[targetId].tracks.some(t => t.url === track.url)) {
            charPlaylists[targetId].tracks.unshift(track);
            saveData(); updateListSelectors();
        }
        return targetId;
    }

    // --- API & Scanner ---
    async function scanLatestChat() {
        if (!settings.isEnabled || !isAuthorized) return;
        const chatMessages = document.querySelectorAll('.mes_text');
        if (chatMessages.length === 0) return;

        const latestMsgBox = chatMessages[chatMessages.length - 1];
        const msgId = latestMsgBox.closest('.mes')?.getAttribute('mesid') || latestMsgBox.innerText.substring(0, 30);
        const originalText = latestMsgBox.innerText;

        chatMessages.forEach(msgBox => {
            if (msgBox.innerHTML.includes('::::') && msgBox.innerHTML.includes('[music]')) {
                msgBox.innerHTML = msgBox.innerHTML.replace(
                    /::::\s*\[music\]\s*(.*?)\s*\((https?:\/\/[^\s)]+)\)\s*::::/gi,
                    `<div class="catta-inline-music" data-url="$2" data-name="$1">
                        <div class="music-icon"><i class="fa-solid fa-compact-disc fa-spin"></i></div>
                        <div class="music-info"><span class="music-title">$1</span><span class="music-status">▶ คลิกเพื่อเล่น</span></div>
                     </div>`
                );
            }
        });

        if (msgId === lastProcessedMsgId) return;
        lastProcessedMsgId = msgId;

        let foundAnyAudio = false; let firstAudioUrl = null;
        const musicMatch = originalText.match(CHAT_MUSIC_REGEX);
        if (musicMatch) {
            addTrackToActiveChar(musicMatch[1], musicMatch[2], "shared");
            firstAudioUrl = musicMatch[2].trim(); foundAnyAudio = true;
        }

        if (foundAnyAudio && firstAudioUrl) {
            let activeChar = getActiveCharInfo();
            let targetId = activeChar ? activeChar.id : 'chat';
            switchTab('char', targetId);
            playTrack(charPlaylists[targetId].tracks.findIndex(t => t.url === firstAudioUrl), 'char', targetId);
            notifyUser("📥 เริ่มเล่นเพลงจากแชท!");
        }

        let sourceText = "";
        try {
            if (window.characters && window.this_chid !== undefined && window.characters[window.this_chid]) {
                const charData = window.characters[window.this_chid];
                sourceText = [charData.description, charData.personality, charData.scenario, charData.first_mes].join('\\n\\n');
            }
        } catch (e) {}

        const uid = localStorage.getItem('catta_uid') || localStorage.getItem('dante_uid');
        const token = localStorage.getItem('catta_auth_token') || localStorage.getItem('dante_token');

        try {
            const res = await fetch(`${settings.apiUrl}/v1/music/scan`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, token, source_text: sourceText, chat_text: originalText })
            });
            const data = await res.json();

            if (data.success) {
                let activeChar = getActiveCharInfo();
                let targetId = activeChar ? activeChar.id : 'chat';
                if (!charPlaylists[targetId]) charPlaylists[targetId] = { name: activeChar ? activeChar.name : "Unknown", avatar: activeChar ? activeChar.avatar : ICON_URL, tracks: [] };

                if (data.playlist && data.playlist.length > 0) {
                    data.playlist.forEach(track => {
                        if (!charPlaylists[targetId].tracks.some(t => t.url === track.url)) {
                            track.name.startsWith('✨') ? charPlaylists[targetId].tracks.unshift(track) : charPlaylists[targetId].tracks.push(track);
                        }
                    });
                    saveData(); updateListSelectors(); if (viewingTab === 'char' && viewingId === targetId) renderPlaylist();
                }

                if (settings.autoMood && data.auto_play_track) {
                    const trackToPlay = charPlaylists[targetId].tracks.findIndex(t => t.url === data.auto_play_track.url);
                    if (trackToPlay !== -1) { playTrack(trackToPlay, 'char', targetId); notifyUser("🎭 เปลี่ยนเพลงตามอารมณ์ฉาก!"); }
                }
            }
        } catch (e) { console.error("API Error:", e); }
    }

    $(document).off('click', '.catta-inline-music').on('click', '.catta-inline-music', function() {
        if (!isAuthorized) { alert("🔒 โปรดเข้าสู่ระบบ"); return; }
        const url = $(this).data('url'); const name = $(this).data('name');
        let targetId = addTrackToActiveChar(name, url, "shared");
        
        const win = $(`#${WIN_ID}`);
        if (!win.is(':visible')) { win.css({ top: '10px', left: '50%', transform: 'none' }); win.fadeIn(200); }
        switchTab('char', targetId);
        playTrack(charPlaylists[targetId].tracks.findIndex(t => t.url === url), 'char', targetId);
    });

    // --- UI Logic ---
    function buildBubble() {
        if (!settings.isEnabled || document.getElementById(BUBBLE_ID)) return;
        const bubble = document.createElement('div');
        bubble.id = BUBBLE_ID;
        bubble.style.cssText = `position:fixed; width:55px; height:55px; top:${settings.posBubble.top}; left:${settings.posBubble.left}; background:url('${ICON_URL}') no-repeat center/contain; z-index:10001; cursor:pointer; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4)); display:${settings.showBubble?'block':'none'};`;
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
        
        // Input ซ่อนสำหรับอัพโหลดรูป
        $("body").append(`<input type="file" id="catta-upload-avatar" style="display:none;" accept="image/png, image/jpeg, image/jpg, image/gif">`);

        const html = `
        <div id="${WIN_ID}" class="cattamusic-window" style="display:none;position:fixed!important;z-index:10000!important;top:15px;left:50%;transform:translateX(-50%);">
            
            <!-- โหมดเต็มรูปแบบ -->
            <div id="catta-full-mode">
                <div class="cattamusic-header">
                    <span class="catta-header-title">🐾 Catta Music</span>
                    <div style="display:flex; gap:5px; align-items:center;">
                        <button id="catta-btn-minimize" class="catta-icon-btn" title="ย่อเป็นแคปซูล">▾</button>
                        <button id="catta-close-win" class="catta-icon-btn" style="color:#ef5350;">×</button>
                    </div>
                </div>
                
                <div id="catta-banner-container">
                    <div class="catta-cover-wrapper" title="คลิกเพื่อเปลี่ยนรูป (เฉพาะโหมดส่วนตัว)">
                        <img id="catta-cover-img" src="${ICON_URL}">
                        <div class="catta-cover-overlay"><i class="fa-solid fa-camera"></i></div>
                    </div>
                    <div class="catta-cover-text">
                        <div id="catta-cover-title">Unknown</div>
                        <div class="cattamusic-marquee-wrapper">
                            <div id="catta-display-name" class="cattamusic-marquee">✨ Ready to play!</div>
                        </div>
                    </div>
                </div>

                <div class="catta-progress-wrap">
                    <div class="catta-progress-bar" id="catta-prog-bar"><div class="catta-progress-fill" id="catta-prog-fill"></div></div>
                </div>
                
                <div class="cattamusic-controls">
                    <button id="catta-btn-loop"><i class="fa-solid fa-arrow-right"></i></button>
                    <button id="catta-btn-prev"><i class="fa-solid fa-backward-step"></i></button>
                    <button id="catta-btn-play" class="play-btn-large"><i class="fa-solid fa-play"></i></button>
                    <button id="catta-btn-next"><i class="fa-solid fa-forward-step"></i></button>
                    <button id="catta-btn-voldown"><i class="fa-solid fa-volume-low"></i></button>
                </div>

                <div class="cattamusic-tabs">
                    <button id="catta-tab-user">👤 ส่วนตัว</button>
                    <button id="catta-tab-char">🐱 ตัวละคร</button>
                    <button id="catta-btn-toggle-tools"><i class="fa-solid fa-sliders"></i></button>
                </div>

                <div id="catta-tools-container" style="display:none; padding:10px;">
                    <div id="catta-user-manager" class="catta-manager-row" style="display:flex;">
                        <div style="display:flex;gap:5px;">
                            <select id="catta-user-sel"></select>
                            <button id="catta-btn-del-user" class="catta-btn-small" style="background:#b71c1c;"><i class="fa-solid fa-trash"></i></button>
                        </div>
                        <div style="display:flex;gap:5px;">
                            <input type="text" id="catta-new-user-name" placeholder="ชื่อเพลย์ลิสต์ใหม่...">
                            <button id="catta-btn-new-user" class="catta-btn-small" style="background:#1b5e20;">สร้าง</button>
                        </div>
                    </div>
                    <div id="catta-char-manager" class="catta-manager-row" style="display:none;">
                        <div style="display:flex;gap:5px;">
                            <select id="catta-char-sel"></select>
                        </div>
                    </div>
                    <div style="display:flex;gap:5px;margin-top:5px;">
                        <input type="text" id="catta-input-url" placeholder="วางลิงก์ .mp3 ที่นี่...">
                        <button id="catta-btn-save" class="catta-btn-small">+ เพิ่ม</button>
                    </div>
                </div>

                <div class="cattamusic-playlist"><div id="catta-list-display"></div></div>
            </div>

            <!-- Ultra Minimal Mode (แคปซูลเล็ก) -->
            <div id="catta-ultra-mini-container" style="display:none;">
                <img id="catta-mini-avatar" src="${ICON_URL}">
                <div class="catta-mini-info">
                    <div id="catta-mini-title">Unknown</div>
                    <div class="catta-progress-bar" id="catta-mini-prog-bar"><div class="catta-progress-fill" id="catta-mini-prog-fill"></div></div>
                </div>
                <button id="catta-mini-prev"><i class="fa-solid fa-backward-step"></i></button>
                <button id="catta-mini-play"><i class="fa-solid fa-play"></i></button>
                <button id="catta-mini-next"><i class="fa-solid fa-forward-step"></i></button>
                <button id="catta-btn-expand" title="ขยาย"><i class="fa-solid fa-up-right-and-down-left-from-center"></i></button>
            </div>

        </div>`;
        $("body").append(html);

        // --- ระบบอัพโหลดรูปภาพลดขนาด (Canvas Resize) ---
        $("#catta-cover-img").on("click", function() {
            if (viewingTab === 'user') $("#catta-upload-avatar").click();
            else notifyUser("⚠️ อัปโหลดรูปได้เฉพาะเพลย์ลิสต์ส่วนตัวครับ");
        });

        $("#catta-upload-avatar").on("change", function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 200; // บีบอัดให้ไม่เกิน 200px ป้องกัน LocalStorage เต็ม
                    let width = img.width; let height = img.height;
                    if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
                    else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    const base64 = canvas.toDataURL('image/jpeg', 0.7);
                    
                    userPlaylists[viewingId].avatar = base64;
                    saveData(); updateCoverUI(); notifyUser("✅ เปลี่ยนรูปสำเร็จ!");
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
            $(this).val(''); // Reset input
        });

        // --- Minimize Logic ---
        let isMinimized = false;
        function setMinimized(state) {
            isMinimized = state;
            if (state) {
                $("#catta-full-mode").hide();
                $("#catta-ultra-mini-container").css('display', 'flex');
                $(`#${WIN_ID}`).addClass('catta-ultra-minimal');
            } else {
                $("#catta-ultra-mini-container").hide();
                $("#catta-full-mode").show();
                $(`#${WIN_ID}`).removeClass('catta-ultra-minimal');
            }
        }
        $('#catta-btn-minimize').on('click', () => setMinimized(true));
        $('#catta-btn-expand').on('click', () => setMinimized(false));

        // Sync Mini Buttons
        $('#catta-mini-play, #catta-btn-play').on('click', () => { if(isAuthorized) togglePlay(); });
        $('#catta-mini-prev, #catta-btn-prev').on('click', () => { if(isAuthorized) playPrev(); });
        $('#catta-mini-next, #catta-btn-next').on('click', () => { if(isAuthorized) playNext(); });
        
        // Progress Bar Click (Seek)
        function seek(e, isMini) {
            if (!audioPlayer.duration) return;
            const bar = isMini ? $('#catta-mini-prog-bar') : $('#catta-prog-bar');
            const rect = bar[0].getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            audioPlayer.currentTime = pos * audioPlayer.duration;
        }
        $('#catta-prog-bar').on('click', (e) => seek(e, false));
        $('#catta-mini-prog-bar').on('click', (e) => seek(e, true));

        // Tabs & Tools
        $('#catta-tab-user').on('click', () => switchTab('user'));
        $('#catta-tab-char').on('click', () => switchTab('char'));
        $("#catta-btn-toggle-tools").on('click', function() { $("#catta-tools-container").slideToggle(200); });
        $("#catta-btn-voldown").on('click', () => { volume = volume > 1 ? volume - 1 : 5; audioPlayer.volume = volume / 5; notifyUser(`Volume: ${volume}`); });
        $("#catta-btn-loop").on('click', changeLoopMode);
        $("#catta-close-win").on('click', () => $(`#${WIN_ID}`).fadeOut(200));

        // Tools Input
        $("#catta-user-sel, #catta-char-sel").on('change', function() { viewingId = $(this).val(); updateCoverUI(); renderPlaylist(); });
        $("#catta-btn-new-user").on('click', () => {
            const n = $("#catta-new-user-name").val().trim(); if (!n) return;
            const nid = "u_" + generateId();
            userPlaylists[nid] = { name: n, avatar: ICON_URL, tracks: [] };
            $("#catta-new-user-name").val(""); saveData(); viewingId = nid; updateListSelectors(); switchTab('user');
        });
        $("#catta-btn-del-user").on('click', () => {
            if (viewingId === 'default') return alert("❌ ลบรายการเริ่มต้นไม่ได้ครับ");
            if (confirm(`ลบเพลย์ลิสต์ "${userPlaylists[viewingId].name}" ใช่ไหม?`)) {
                delete userPlaylists[viewingId]; viewingId = 'default';
                if(playingTab === 'user' && playingId === viewingId) playingId = 'default';
                saveData(); updateListSelectors(); switchTab('user');
            }
        });
        $("#catta-btn-save").on('click', () => {
            if (!isAuthorized) return;
            const url = $("#catta-input-url").val().trim();
            if (url) { 
                let listObj = viewingTab === 'user' ? userPlaylists : charPlaylists;
                listObj[viewingId].tracks.push({ name: url.split('/').pop() || "Unknown", url }); 
                $("#catta-input-url").val(""); saveData(); renderPlaylist(); 
            }
        });

        updateListSelectors(); switchTab('user'); applyTheme(settings.theme);
        
        // ลากหน้าต่างได้จาก Header โหมดเต็ม และพื้นที่ว่างโหมด Mini
        makeDraggable(document.getElementById(WIN_ID), '.cattamusic-header');
        makeDraggable(document.getElementById(WIN_ID), '#catta-ultra-mini-container', false, true);

        // Update Progress Bar
        audioPlayer.addEventListener('timeupdate', () => {
            if (!audioPlayer.duration) return;
            const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            $('#catta-prog-fill, #catta-mini-prog-fill').css('width', pct + '%');
        });
    }

    function updateListSelectors() {
        const uSel = $("#catta-user-sel").empty();
        for (const [id, data] of Object.entries(userPlaylists)) uSel.append(`<option value="${id}">${data.name}</option>`);
        uSel.val(viewingTab === 'user' ? viewingId : 'default');

        const cSel = $("#catta-char-sel").empty();
        for (const [id, data] of Object.entries(charPlaylists)) cSel.append(`<option value="${id}">${data.name}</option>`);
        cSel.val(viewingTab === 'char' ? viewingId : 'chat');
    }

    function updateCoverUI() {
        let title = "Unknown"; let img = ICON_URL; let charTabName = "🐱 ตัวละคร";
        let targetTab = isPlaying ? playingTab : viewingTab;
        let targetId = isPlaying ? playingId : viewingId;

        // อัปเดตข้อมูลตัวละครปัจจุบันเสมอ
        let activeChar = getActiveCharInfo();
        if (activeChar && charPlaylists['chat']) {
            charPlaylists['chat'].name = activeChar.name;
            charPlaylists['chat'].avatar = activeChar.avatar;
        }

        if (targetTab === 'user') {
            const p = userPlaylists[targetId];
            if (p) { title = p.name; img = p.avatar || ICON_URL; }
            const c = charPlaylists[viewingId];
            if (c && viewingId !== 'chat') charTabName = `🐱 ${c.name}`;
        } else {
            const p = charPlaylists[targetId];
            if (p) { title = p.name; img = p.avatar || ICON_URL; if (targetId !== 'chat') charTabName = `🐱 ${p.name}`; }
        }
        
        $("#catta-cover-title, #catta-mini-title").text(title);
        $("#catta-cover-img, #catta-mini-avatar").attr("src", img);
        
        const tabBtn = $("#catta-tab-char");
        const newText = charTabName.length > 12 ? charTabName.substring(0, 12) + '...' : charTabName;
        tabBtn.text(newText);

        // Hover Effect ถ้ารูปสามารถคลิกเปลี่ยนได้
        if (viewingTab === 'user') $('.catta-cover-wrapper').addClass('can-upload');
        else $('.catta-cover-wrapper').removeClass('can-upload');
    }

    function togglePlayerSmart() {
        if (isToggling) return;
        isToggling = true; setTimeout(() => { isToggling = false; }, 500); // 0.5s Cooldown ป้องกันสแปมคลิก

        const win = $(`#${WIN_ID}`);
        if (win.is(':visible')) win.fadeOut(200);
        else { 
            checkAuth(); 
            // บังคับเกิดกลางจอบนสุดเสมอตอนเปิด
            const rect = win[0].getBoundingClientRect();
            win.css({ top: '15px', left: `calc(50vw - ${rect.width/2}px)`, transform: 'none' }); 
            win.fadeIn(200); 
        }
    }

    function makeDraggable(el, handleSelector, isBubble = false, isMiniDrag = false) {
        if (!el) return;
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const handle = handleSelector ? el.querySelector(handleSelector) : el;
        if (!handle) return;
        
        const dragStart = (e) => {
            // ป้องกันคลิกปุ่มแล้วลาก
            if (isMiniDrag && (e.target.tagName === 'BUTTON' || e.target.tagName === 'I' || e.target.className.includes('catta-progress'))) return;

            const cx = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const cy = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            pos3 = cx; pos4 = cy;

            // แก้บั๊ก transform เวลาลากหน้าต่างหลัก
            if (!isBubble && el.style.transform && el.style.transform.includes('translate')) {
                const rect = el.getBoundingClientRect();
                el.style.transform = "none";
                el.style.left = rect.left + "px";
                el.style.top = rect.top + "px";
            }

            document.onmouseup = document.ontouchend = () => {
                document.onmouseup = document.ontouchend = document.onmousemove = document.ontouchmove = null;
                if (isBubble) { settings.posBubble = { top: (el.offsetTop/window.innerHeight*100)+"%", left: (el.offsetLeft/window.innerWidth*100)+"%" }; saveData(); }
            };
            document.onmousemove = document.ontouchmove = (e) => {
                const cx = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
                const cy = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
                pos1 = pos3 - cx; pos2 = pos4 - cy; pos3 = cx; pos4 = cy;
                let nTop = el.offsetTop - pos2, nLeft = el.offsetLeft - pos1;
                const m = 5;
                nLeft = Math.max(m, Math.min(nLeft, window.innerWidth - el.offsetWidth - m));
                nTop = Math.max(m, Math.min(nTop, window.innerHeight - el.offsetHeight - m));
                el.style.top = nTop + "px"; el.style.left = nLeft + "px";
            };
        };
        handle.onmousedown = handle.ontouchstart = dragStart;
    }

    function switchTab(tab, forceId = null) {
        viewingTab = tab;
        viewingId = forceId || (tab === 'user' ? $("#catta-user-sel").val() : $("#catta-char-sel").val());
        $('.cattamusic-tabs button').removeClass('active');
        $(`#catta-tab-${tab}`).addClass('active');
        $('#catta-user-manager').toggle(tab === 'user');
        $('#catta-char-manager').toggle(tab === 'char');
        updateListSelectors(); updateCoverUI(); renderPlaylist();
    }

    function renderPlaylist() {
        const container = $("#catta-list-display");
        if(!container.length) return;
        container.empty();
        
        const list = getViewingArray();
        list.forEach((track, i) => {
            const isActive = (playingTab === viewingTab && playingId === viewingId && currentTrackIndex === i);
            const item = $(`
                <div class="playlist-item ${isActive?'active-track':''}">
                    <span class="track-num-badge">${isActive && isPlaying ? '<i class="fa-solid fa-compact-disc fa-spin"></i>' : i+1}</span>
                    <span class="track-name-text">${track.name}</span>
                    <span class="del-btn">×</span>
                </div>
            `);
            item.find('.track-name-text').on('click', () => isAuthorized && playTrack(i, viewingTab, viewingId));
            item.find('.del-btn').on('click', (e) => { e.stopPropagation(); list.splice(i, 1); saveData(); renderPlaylist(); });
            container.append(item);
        });
    }

    function playTrack(i, tab, id) {
        playingTab = tab; playingId = id;
        const list = getPlayingArray();
        if (i < 0 || i >= list.length) return;
        
        currentTrackIndex = i;
        audioPlayer.src = list[i].url; audioPlayer.volume = volume / 5;
        audioPlayer.play().catch(e => console.warn("Auto-play blocked"));
        isPlaying = true;
        
        $("#catta-btn-play, #catta-mini-play").html('<i class="fa-solid fa-pause"></i>');
        $("#catta-display-name").text(list[i].name);
        
        updateCoverUI(); renderPlaylist();
    }

    function togglePlay() {
        const list = viewingTab === 'char' ? charPlaylists[viewingId].tracks : userPlaylists[viewingId].tracks;
        if (!audioPlayer.src || audioPlayer.src === window.location.href) {
            if (list && list.length > 0) return playTrack(0, viewingTab, viewingId);
            else return notifyUser("⚠️ เพลย์ลิสต์นี้ว่างเปล่า");
        }
        if (isPlaying) { audioPlayer.pause(); $("#catta-btn-play, #catta-mini-play").html('<i class="fa-solid fa-play"></i>'); }
        else { audioPlayer.play(); $("#catta-btn-play, #catta-mini-play").html('<i class="fa-solid fa-pause"></i>'); }
        isPlaying = !isPlaying; updateCoverUI(); renderPlaylist();
    }

    function playNext() { const l = getPlayingArray(); if(l.length) playTrack((currentTrackIndex+1)%l.length, playingTab, playingId); }
    function playPrev() { const l = getPlayingArray(); if(l.length) playTrack((currentTrackIndex-1+l.length)%l.length, playingTab, playingId); }
    function changeLoopMode() {
        loopMode = (loopMode + 1) % 4;
        const btn = $("#catta-btn-loop");
        if (loopMode === 0) btn.html('<i class="fa-solid fa-arrow-right"></i>');
        else if (loopMode === 1) btn.html('<i class="fa-solid fa-repeat"></i>');
        else if (loopMode === 2) btn.html('<div style="position:relative;"><i class="fa-solid fa-repeat"></i><span style="position:absolute;top:-2px;right:-4px;font-size:8px;">1</span></div>');
        else if (loopMode === 3) btn.html('<i class="fa-solid fa-shuffle"></i>');
    }

    function applyTheme(themeName) {
        settings.theme = themeName; saveData();
        const t = themes[themeName] || themes.pink;
        document.documentElement.style.setProperty('--catta-main', t.main);
        document.documentElement.style.setProperty('--catta-accent2', t.accent);
    }

    function notifyUser(msg) {
        const marquee = $("#catta-display-name"); const old = marquee.text();
        marquee.text(msg); setTimeout(() => marquee.text(old), 5000);
    }

    // --- Init ---
    $(document).on('visual_update_event', () => { scanLatestChat(); });

    function init() {
        loadData();
        if (settings.isEnabled) { buildBubble(); buildPlayerWindow(); checkAuth(); setTimeout(scanLatestChat, 1000); }
    }

    if (window.jQuery && $("#extensions_settings").length) init();
    else { const iv = setInterval(() => { if (window.jQuery && $("#extensions_settings").length) { clearInterval(iv); init(); } }, 500); }

    audioPlayer.onended = () => {
        if (loopMode === 2) playTrack(currentTrackIndex, playingTab, playingId);
        else if (loopMode === 3) { const l = getPlayingArray(); playTrack(Math.floor(Math.random()*l.length), playingTab, playingId); }
        else playNext();
    };

})();
