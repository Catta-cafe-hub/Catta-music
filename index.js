/**
 * Catta Music Player Extension for SillyTavern
 * ระบบไอคอนลอย, เปลี่ยนธีมสี และการตั้งค่าผ่านเมนู ST
 */

(function() {
    "use strict";

    const EXT_ID = "cattamusic";
    const WIN_ID = "cattamusic-player-window";
    const BUBBLE_ID = "cattamusic-bubble";
    const LS_PLAYLIST = "cattamusic_playlist";
    const LS_SETTINGS = "cattamusic_settings";
    const ICON_URL = "https://file.garden/aZx9zS2e7UEiSmfr/cattamusic.png";

    let settings = {
        showBubble: true,
        isEnabled: true,
        theme: 'orange',
        posBubble: { top: '80%', left: '20px' },
        posWin: { top: '100px', left: '100px' }
    };

    let playlist = [];
    let currentTrackIndex = -1;
    let audioPlayer = new Audio();
    let isPlaying = false;
    let volume = 3;
    let loopMode = 0;

    const themes = {
        orange: { main: '#ff9800', bg: '#fffaf0', screen: '#e0f2f1', text: '#333' },
        pink: { main: '#f06292', bg: '#fce4ec', screen: '#f8bbd0', text: '#880e4f' },
        blue: { main: '#2196f3', bg: '#e3f2fd', screen: '#bbdefb', text: '#0d47a1' },
        dark: { main: '#424242', bg: '#212121', screen: '#37474f', text: '#eceff1' },
        purple: { main: '#9c27b0', bg: '#f3e5f5', screen: '#e1bee7', text: '#4a148c' }
    };

    // --- Helper: Load/Save ---
    function loadData() {
        const s = localStorage.getItem(LS_SETTINGS);
        if (s) settings = { ...settings, ...JSON.parse(s) };
        const p = localStorage.getItem(LS_PLAYLIST);
        if (p) playlist = JSON.parse(p);
    }

    function saveData() {
        localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
        localStorage.setItem(LS_PLAYLIST, JSON.stringify(playlist));
    }

    // --- Draggable Logic ---
    function makeDraggable(el, handleSelector, isBubble = false) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const handle = handleSelector ? el.querySelector(handleSelector) : el;
        
        handle.onmousedown = (e) => {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = () => {
                document.onmouseup = null;
                document.onmousemove = null;
                // Save position
                if (isBubble) {
                    settings.posBubble = { top: el.style.top, left: el.style.left };
                } else {
                    settings.posWin = { top: el.style.top, left: el.style.left };
                }
                saveData();
            };
            document.onmousemove = (e) => {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                el.style.top = (el.offsetTop - pos2) + "px";
                el.style.left = (el.offsetLeft - pos1) + "px";
            };
        };
    }

    // --- UI Builders ---
    function applyTheme(themeName) {
        const T = themes[themeName] || themes.orange;
        const root = document.getElementById(WIN_ID);
        if (!root) return;
        
        root.style.borderColor = T.main;
        root.style.backgroundColor = T.bg;
        root.style.color = T.text;
        
        root.querySelector('.cattamusic-header').style.backgroundColor = T.main;
        root.querySelector('.cattamusic-screen').style.backgroundColor = T.screen;
        root.querySelector('.cattamusic-screen').style.borderColor = T.main;
        
        root.querySelectorAll('.cattamusic-controls button').forEach(btn => {
            btn.style.borderColor = T.main;
            btn.style.color = T.main;
        });
        
        settings.theme = themeName;
        saveData();
    }

    function buildSettings() {
        if ($(`#${EXT_ID}-settings`).length) return;

        const html = `
            <div id="${EXT_ID}-settings" class="cattamusic-settings-block">
                <h4>🐾 Catta Music Player</h4>
                <div class="flex-container flex-align-center">
                    <input type="checkbox" id="catta-cfg-enabled" ${settings.isEnabled ? 'checked' : ''}>
                    <label for="catta-cfg-enabled">เปิดการทำงานส่วนเสริม</label>
                </div>
                <div class="flex-container flex-align-center">
                    <input type="checkbox" id="catta-cfg-bubble" ${settings.showBubble ? 'checked' : ''}>
                    <label for="catta-cfg-bubble">แสดงไอคอนแมวส้มลอย (Bubble)</label>
                </div>
                <div style="margin-top:10px;">
                    <label>เลือกธีมสี:</label>
                    <div class="theme-selectors" style="display:flex; gap:5px; margin-top:5px;">
                        <div class="theme-dot" data-theme="orange" style="background:#ff9800;"></div>
                        <div class="theme-dot" data-theme="pink" style="background:#f06292;"></div>
                        <div class="theme-dot" data-theme="blue" style="background:#2196f3;"></div>
                        <div class="theme-dot" data-theme="dark" style="background:#424242;"></div>
                        <div class="theme-dot" data-theme="purple" style="background:#9c27b0;"></div>
                    </div>
                </div>
            </div>
        `;
        $('#extensions_settings').append(html);

        $('#catta-cfg-enabled').on('change', function() {
            settings.isEnabled = this.checked;
            saveData();
            location.reload(); // รีโหลดเพื่อนำการตั้งค่าไปใช้
        });

        $('#catta-cfg-bubble').on('change', function() {
            settings.showBubble = this.checked;
            $(`#${BUBBLE_ID}`).toggle(settings.showBubble);
            saveData();
        });

        $('.theme-dot').on('click', function() {
            applyTheme($(this).data('theme'));
        });
    }

    function buildBubble() {
        if (!settings.isEnabled || document.getElementById(BUBBLE_ID)) return;
        const bubble = document.createElement('div');
        bubble.id = BUBBLE_ID;
        bubble.style.cssText = `
            position: fixed;
            width: 60px; height: 60px;
            top: ${settings.posBubble.top}; left: ${settings.posBubble.left};
            background: url('${ICON_URL}') no-repeat center/contain;
            z-index: 10001; cursor: pointer;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
            display: ${settings.showBubble ? 'block' : 'none'};
        `;
        document.body.appendChild(bubble);
        makeDraggable(bubble, null, true);
        
        let startX, startY;
        bubble.addEventListener('mousedown', (e) => { startX = e.clientX; startY = e.clientY; });
        bubble.addEventListener('mouseup', (e) => {
            // ถ้าขยับไม่เกิน 5px ถือว่าเป็นคลิก (ไม่ใช่การลาก)
            if (Math.abs(e.clientX - startX) < 5 && Math.abs(e.clientY - startY) < 5) {
                $(`#${WIN_ID}`).toggle();
            }
        });
    }

    function buildPlayerWindow() {
        if (!settings.isEnabled || document.getElementById(WIN_ID)) return;

        const html = `
            <div id="${WIN_ID}" style="display: none; position: fixed; top: ${settings.posWin.top}; left: ${settings.posWin.left}; z-index: 10000;">
                <div class="cattamusic-header">
                    <span>🐾 Catta Music</span>
                    <button id="catta-close-win">×</button>
                </div>
                <div class="cattamusic-screen">
                    <div class="cattamusic-status-bar">
                        <span id="catta-time">00:00</span>
                        <span id="catta-vol">Vol: 3</span>
                        <span id="catta-track-count">0 tracks</span>
                    </div>
                    <div class="cattamusic-marquee-container">
                        <div id="catta-display-name" class="cattamusic-marquee">Catta Music — พร้อมรับคำสั่งเจ้าค่ะ...</div>
                    </div>
                </div>
                <div class="cattamusic-controls">
                    <button id="catta-btn-loop"><i class="fa-solid fa-arrow-right"></i></button>
                    <button id="catta-btn-prev"><i class="fa-solid fa-backward-step"></i></button>
                    <button id="catta-btn-play"><i class="fa-solid fa-play"></i></button>
                    <button id="catta-btn-next"><i class="fa-solid fa-forward-step"></i></button>
                    <button id="catta-btn-voldown"><i class="fa-solid fa-volume-low"></i></button>
                    <button id="catta-btn-volup"><i class="fa-solid fa-volume-high"></i></button>
                </div>
                <div class="cattamusic-playlist">
                    <input type="text" id="catta-input-url" placeholder="วางลิ้งค์ .mp3 ตรงนี้..." style="width: 100%; font-size: 11px; margin-bottom:5px;">
                    <button id="catta-btn-save" class="catta-btn-small">Add Music</button>
                    <div id="catta-list-display" class="catta-scroll-list"></div>
                </div>
            </div>
        `;
        $("body").append(html);
        makeDraggable(document.getElementById(WIN_ID), '.cattamusic-header');
        applyTheme(settings.theme);

        // Events
        $("#catta-close-win").on('click', () => $(`#${WIN_ID}`).hide());
        $("#catta-btn-save").on('click', () => {
            const url = $("#catta-input-url").val().trim();
            if (url) {
                playlist.push({ name: url.split('/').pop(), url });
                $("#catta-input-url").val("");
                saveData(); renderPlaylist();
            }
        });
        
        $("#catta-btn-play").on('click', togglePlay);
        $("#catta-btn-next").on('click', playNext);
        $("#catta-btn-prev").on('click', playPrev);
        $("#catta-btn-volup").on('click', () => changeVolume(1));
        $("#catta-btn-voldown").on('click', () => changeVolume(-1));
        $("#catta-btn-loop").on('click', changeLoopMode);

        setInterval(() => {
            const n = new Date();
            $("#catta-time").text(n.getHours().toString().padStart(2, '0') + ":" + n.getMinutes().toString().padStart(2, '0'));
        }, 1000);

        renderPlaylist();
    }

    // --- Audio Logic ---
    function renderPlaylist() {
        const container = $("#catta-list-display");
        container.empty();
        playlist.forEach((track, i) => {
            const item = $(`<div style="font-size:10px; padding:3px; border-bottom:1px solid rgba(0,0,0,0.05); display:flex; justify-content:space-between; cursor:pointer;">
                <span class="${currentTrackIndex===i?'active-track':''}">${i+1}. ${track.name}</span>
                <span style="color:red;">×</span>
            </div>`);
            item.find('span:first').on('click', () => playTrack(i));
            item.find('span:last').on('click', (e) => { e.stopPropagation(); playlist.splice(i, 1); saveData(); renderPlaylist(); });
            container.append(item);
        });
        $("#catta-track-count").text(`${playlist.length} tracks`);
    }

    function playTrack(i) {
        if (i < 0 || i >= playlist.length) return;
        currentTrackIndex = i;
        audioPlayer.src = playlist[i].url;
        audioPlayer.volume = volume / 5;
        audioPlayer.play();
        isPlaying = true;
        $("#catta-btn-play").html('<i class="fa-solid fa-pause"></i>');
        $("#catta-display-name").text(playlist[i].name);
        renderPlaylist();
    }

    function togglePlay() {
        if (!audioPlayer.src && playlist.length > 0) return playTrack(0);
        if (isPlaying) { audioPlayer.pause(); $("#catta-btn-play").html('<i class="fa-solid fa-play"></i>'); }
        else { audioPlayer.play(); $("#catta-btn-play").html('<i class="fa-solid fa-pause"></i>'); }
        isPlaying = !isPlaying;
    }

    function playNext() { playTrack((currentTrackIndex + 1) % playlist.length); }
    function playPrev() { playTrack((currentTrackIndex - 1 + playlist.length) % playlist.length); }

    function changeVolume(v) {
        volume = Math.min(5, Math.max(1, volume + v));
        audioPlayer.volume = volume / 5;
        $("#catta-vol").text(`Vol: ${volume}`);
    }

    function changeLoopMode() {
        loopMode = (loopMode + 1) % 4;
        const btn = $("#catta-btn-loop");
        if (loopMode === 0) btn.html('<i class="fa-solid fa-arrow-right"></i>');
        else if (loopMode === 1) btn.html('<i class="fa-solid fa-rotate"></i>');
        else if (loopMode === 2) btn.html('<i class="fa-solid fa-rotate"></i><small>1</small>');
        else btn.html('<i class="fa-solid fa-shuffle"></i>');
    }

    audioPlayer.onended = () => {
        if (loopMode === 2) playTrack(currentTrackIndex);
        else if (loopMode === 3) playTrack(Math.floor(Math.random() * playlist.length));
        else if (loopMode === 1 || currentTrackIndex < playlist.length - 1) playNext();
    };

    // --- Init ---
    function init() {
        loadData();
        buildSettings();
        if (settings.isEnabled) {
            buildBubble();
            buildPlayerWindow();
        }
    }

    if (window.jQuery && $("#extensions_settings").length) init();
    else {
        const iv = setInterval(() => {
            if (window.jQuery && $("#extensions_settings").length) { clearInterval(iv); init(); }
        }, 500);
    }
})();
