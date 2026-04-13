/**
 * Catta Music Player Extension - Secured Version (Top-Center Lock)
 * 🔒 Brain & Logic moved to Casa VPS Backend
 * 📍 Window Locked to Top-Center for Mobile accessibility
 */

(function() {
    "use strict";

    const EXT_ID = "cattamusic";
    const WIN_ID = "cattamusic-player-window";
    const BUBBLE_ID = "cattamusic-bubble";
    const LS_USER_PLAYLIST = "cattamusic_user_playlist";
    const LS_SETTINGS = "cattamusic_settings";
    const ICON_URL = "https://file.garden/aZx9zS2e7UEiSmfr/cattamusic.png";
    const CASA_API = "https://st-cattacafe.casa:2096/v1/music/scan";

    let settings = { showBubble: true, isEnabled: true, autoMood: true, theme: 'orange', currentTab: 'user', posBubble: { top: '80%', left: '10%' } };
    let userPlaylist = [], charPlaylist = [];
    let currentTrackIndex = -1, activeSource = 'user';
    let audioPlayer = new Audio(), isPlaying = false, volume = 3, loopMode = 0;
    let isAuthorized = false;

    const themes = {
        orange: { main: '#ff9800', bg: '#fffaf0', screen: '#e0f2f1', text: '#333' },
        pink: { main: '#f06292', bg: '#fce4ec', screen: '#f8bbd0', text: '#880e4f' },
        blue: { main: '#2196f3', bg: '#e3f2fd', screen: '#bbdefb', text: '#0d47a1' },
        dark: { main: '#424242', bg: '#212121', screen: '#37474f', text: '#eceff1' },
        purple: { main: '#9c27b0', bg: '#f3e5f5', screen: '#e1bee7', text: '#4a148c' }
    };

    function loadData() {
        const s = localStorage.getItem(LS_SETTINGS);
        if (s) settings = { ...settings, ...JSON.parse(s) };
        const p = localStorage.getItem(LS_USER_PLAYLIST);
        if (p) userPlaylist = JSON.parse(p);
    }

    function saveData() {
        localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
        localStorage.setItem(LS_USER_PLAYLIST, JSON.stringify(userPlaylist));
    }

    function getCattaAuth() {
        return {
            uid: localStorage.getItem('catta_uid') || localStorage.getItem('dante_uid'),
            token: localStorage.getItem('catta_auth_token') || localStorage.getItem('dante_token') || localStorage.getItem('catta_token')
        };
    }

    async function verifyAccess() {
        const auth = getCattaAuth();
        if (!auth.uid || !auth.token) { isAuthorized = false; showLockedUI(); return false; }
        try {
            const res = await fetch(CASA_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: auth.uid, token: auth.token, check_only: true }) });
            const data = await res.json();
            isAuthorized = data.success === true;
            if (isAuthorized) hideLockedUI(); else showLockedUI();
            return isAuthorized;
        } catch (e) { return false; }
    }

    function showLockedUI() {
        $(`#${WIN_ID} .cattamusic-controls, #${WIN_ID} .cattamusic-tabs, #${WIN_ID} .cattamusic-playlist`).css({'filter':'blur(4px) grayscale(1)', 'pointer-events':'none'});
        $("#catta-display-name").html("<span style='color:red;'>🔒 LOCK: Please Login Catta Cafe</span>");
        if (isPlaying) { audioPlayer.pause(); isPlaying = false; }
    }

    function hideLockedUI() {
        $(`#${WIN_ID} .cattamusic-controls, #${WIN_ID} .cattamusic-tabs, #${WIN_ID} .cattamusic-playlist`).css({'filter':'none', 'pointer-events':'auto'});
    }

    async function syncWithCasaBrain() {
        if (!settings.isEnabled || !isAuthorized) return;
        const auth = getCattaAuth();
        const context = window.SillyTavern.getContext();
        let sourceText = "";
        if (context.character) sourceText += context.character.description + " " + context.character.first_mes;
        if (context.world_info) context.world_info.forEach(e => sourceText += " " + e.content);
        let chatText = (context.chat && context.chat.length > 0 && context.chat[context.chat.length - 1].role === 'assistant') ? context.chat[context.chat.length - 1].mes : "";

        try {
            const res = await fetch(CASA_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: auth.uid, token: auth.token, source_text: sourceText, chat_text: chatText }) });
            const data = await res.json();
            if (data.success) {
                charPlaylist = data.playlist || [];
                if (data.auto_play_track && settings.autoMood) {
                    const idx = charPlaylist.findIndex(t => t.url === data.auto_play_track.url);
                    if (idx !== -1) playTrack(idx, 'char');
                }
                renderPlaylist();
            }
        } catch (e) {}
    }

    function buildPlayerWindow() {
        if (document.getElementById(WIN_ID)) return;
        const html = `
            <div id="${WIN_ID}" style="display: none; position: fixed; z-index: 10000; top: 10px; left: 50%; transform: translateX(-50%);">
                <div class="cattamusic-header"><span>🐾 Catta Music Player</span><button id="catta-close-win">×</button></div>
                <div class="cattamusic-screen">
                    <div class="cattamusic-status-bar"><span id="catta-time">00:00</span><span id="catta-vol">Vol: 3</span><span id="catta-track-count">0 tracks</span></div>
                    <div class="cattamusic-marquee-container"><div id="catta-display-name" class="cattamusic-marquee">Checking System License...</div></div>
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
                    <div id="catta-user-input"><input type="text" id="catta-input-url" placeholder="วางลิ้งค์ .mp3 ..."><button id="catta-btn-save" class="catta-btn-small">Add Music</button></div>
                    <div id="catta-list-display" class="catta-scroll-list"></div>
                </div>
            </div>`;
        $("body").append(html);
        switchTab(settings.currentTab);
        $('#catta-tab-user').on('click', () => switchTab('user'));
        $('#catta-tab-char').on('click', () => switchTab('char'));
        $("#catta-btn-play").on('click', () => isAuthorized && togglePlay());
        $("#catta-btn-next").on('click', () => isAuthorized && playNext());
        $("#catta-btn-prev").on('click', () => isAuthorized && playPrev());
        $("#catta-btn-volup").on('click', () => isAuthorized && changeVolume(1));
        $("#catta-btn-voldown").on('click', () => isAuthorized && changeVolume(-1));
        $("#catta-btn-loop").on('click', () => isAuthorized && changeLoopMode());
        $("#catta-close-win").on('click', () => $(`#${WIN_ID}`).fadeOut(200));
        $("#catta-btn-save").on('click', () => {
            if (!isAuthorized) return;
            const url = $("#catta-input-url").val().trim();
            if (url) { userPlaylist.push({ name: url.split('/').pop(), url }); $("#catta-input-url").val(""); saveData(); renderPlaylist(); }
        });
        applyTheme(settings.theme);
        setInterval(() => { const n = new Date(); $("#catta-time").text(n.getHours().toString().padStart(2, '0') + ":" + n.getMinutes().toString().padStart(2, '0')); }, 1000);
    }

    function makeDraggable(el, handleSelector, isBubble = false) {
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
                if (!isBubble) el.style.transform = "none"; // ยกเลิกการกลางจอเมื่อเริ่มลาก
            };
        };
        handle.onmousedown = handle.ontouchstart = dragStart;
    }

    function switchTab(tab) {
        settings.currentTab = tab;
        $('.cattamusic-tabs button').removeClass('active');
        $(`#catta-tab-${tab}`).addClass('active');
        $('#catta-user-input').toggle(tab === 'user');
        saveData(); renderPlaylist();
    }

    function renderPlaylist() {
        const container = $("#catta-list-display");
        container.empty();
        const list = settings.currentTab === 'user' ? userPlaylist : charPlaylist;
        list.forEach((track, i) => {
            const isActive = (activeSource === settings.currentTab && currentTrackIndex === i);
            const item = $(`<div class="playlist-item ${isActive?'active-track':''}"><span>${i+1}. ${track.name}</span>${settings.currentTab === 'user' ? '<span class="del-btn">×</span>' : ''}</div>`);
            item.find('span:first').on('click', () => isAuthorized && playTrack(i, settings.currentTab));
            item.find('.del-btn').on('click', (e) => { e.stopPropagation(); userPlaylist.splice(i, 1); saveData(); renderPlaylist(); });
            container.append(item);
        });
        $("#catta-track-count").text(`${list.length} tracks`);
    }

    function playTrack(i, source) {
        const list = source === 'user' ? userPlaylist : charPlaylist;
        if (i < 0 || i >= list.length) return;
        currentTrackIndex = i; activeSource = source;
        audioPlayer.src = list[i].url;
        audioPlayer.volume = volume / 5;
        audioPlayer.play();
        isPlaying = true;
        $("#catta-btn-play").html('<i class="fa-solid fa-pause"></i>');
        $("#catta-display-name").text(list[i].name);
        renderPlaylist();
    }

    function togglePlay() {
        const list = activeSource === 'user' ? userPlaylist : charPlaylist;
        if (!audioPlayer.src && list.length > 0) return playTrack(0, activeSource);
        if (isPlaying) { audioPlayer.pause(); $("#catta-btn-play").html('<i class="fa-solid fa-play"></i>'); }
        else { audioPlayer.play(); $("#catta-btn-play").html('<i class="fa-solid fa-pause"></i>'); }
        isPlaying = !isPlaying;
    }

    function playNext() { const l = activeSource==='user'?userPlaylist:charPlaylist; if(l.length) playTrack((currentTrackIndex+1)%l.length, activeSource); }
    function playPrev() { const l = activeSource==='user'?userPlaylist:charPlaylist; if(l.length) playTrack((currentTrackIndex-1+l.length)%l.length, activeSource); }
    function changeVolume(v) { volume = Math.min(5, Math.max(1, volume + v)); audioPlayer.volume = volume/5; $("#catta-vol").text(`Vol: ${volume}`); }
    function changeLoopMode() { loopMode = (loopMode + 1) % 4; const btn = $("#catta-btn-loop"); const icons = ['arrow-right', 'rotate', 'rotate', 'shuffle']; btn.html(`<i class="fa-solid fa-${icons[loopMode]}"></i>${loopMode===2?'<small>1</small>':''}`); }

    function applyTheme(themeName) {
        const T = themes[themeName] || themes.orange;
        const win = $(`#${WIN_ID}`);
        win.css({ 'border-color': T.main, 'background-color': T.bg, 'color': T.text });
        win.find('.cattamusic-header, .catta-btn-small, .cattamusic-tabs .active').css('background-color', T.main);
        win.find('.cattamusic-screen').css({ 'background-color': T.screen, 'border-color': T.main });
        win.find('.cattamusic-controls button, .cattamusic-tabs button').css({ 'border-color': T.main, 'color': T.main });
        win.find('.cattamusic-tabs .active').css('color', 'white');
        settings.theme = themeName; saveData();
    }

    function buildBubble() {
        if (document.getElementById(BUBBLE_ID)) return;
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
            if (Math.abs(cX-sX)<5 && Math.abs(cY-sY)<5) togglePlayerTopCenter();
        };
        bubble.addEventListener('mouseup', click); bubble.addEventListener('touchend', click);
    }

    function togglePlayerTopCenter() {
        const win = $(`#${WIN_ID}`);
        if (win.is(':visible')) win.fadeOut(200);
        else {
            // ล็อคให้เด้งขึ้นบนสุด-กลางจอเสมอ
            win.css({
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)'
            });
            win.fadeIn(200);
            verifyAccess();
        }
    }

    $(document).on('visual_update_event', () => { verifyAccess().then(ok => ok && syncWithCasaBrain()); });

    function init() {
        loadData();
        if (settings.isEnabled) {
            buildBubble();
            buildPlayerWindow();
            makeDraggable(document.getElementById(WIN_ID), '.cattamusic-header');
            verifyAccess().then(ok => ok && syncWithCasaBrain());
        }
    }

    if (window.jQuery && $("#extensions_settings").length) init();
    else { const iv = setInterval(() => { if (window.jQuery && $("#extensions_settings").length) { clearInterval(iv); init(); } }, 500); }

    audioPlayer.onended = () => {
        if (loopMode === 2) playTrack(currentTrackIndex, activeSource);
        else if (loopMode === 3) { const l = activeSource==='user'?userPlaylist:charPlaylist; playTrack(Math.floor(Math.random()*l.length), activeSource); }
        else playNext();
    };
})();
