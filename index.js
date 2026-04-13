/**
 * Catta Music Player Extension for SillyTavern
 * ระบบ Responsive, Boundary Lock, และ Smart Positioning
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
        posBubble: { top: '80%', left: '10%' },
        posWin: { top: '20%', left: '50%' }
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

    // --- ระบบลากแบบไม่หลุดขอบจอ ---
    function makeDraggable(el, handleSelector, isBubble = false) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const handle = handleSelector ? el.querySelector(handleSelector) : el;
        
        handle.onmousedown = dragMouseDown;
        handle.ontouchstart = dragMouseDown;

        function dragMouseDown(e) {
            // รองรับทั้ง Mouse และ Touch
            const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            
            pos3 = clientX;
            pos4 = clientY;
            
            document.onmouseup = closeDragElement;
            document.ontouchend = closeDragElement;
            document.onmousemove = elementDrag;
            document.ontouchmove = elementDrag;
        }

        function elementDrag(e) {
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

            pos1 = pos3 - clientX;
            pos2 = pos4 - clientY;
            pos3 = clientX;
            pos4 = clientY;

            let newTop = el.offsetTop - pos2;
            let newLeft = el.offsetLeft - pos1;

            // ตรวจสอบขอบจอ (Boundary Clamp)
            const margin = 10;
            const maxLeft = window.innerWidth - el.offsetWidth - margin;
            const maxTop = window.innerHeight - el.offsetHeight - margin;

            newLeft = Math.max(margin, Math.min(newLeft, maxLeft));
            newTop = Math.max(margin, Math.min(newTop, maxTop));

            el.style.top = newTop + "px";
            el.style.left = newLeft + "px";
            el.style.bottom = "auto";
            el.style.right = "auto";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.ontouchend = null;
            document.onmousemove = null;
            document.ontouchmove = null;

            // บันทึกตำแหน่งเป็น % เพื่อความ Responsive
            settings[isBubble ? 'posBubble' : 'posWin'] = {
                top: (el.offsetTop / window.innerHeight * 100) + "%",
                left: (el.offsetLeft / window.innerWidth * 100) + "%"
            };
            saveData();
        }
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
                    <div class="theme-selectors">
                        ${Object.keys(themes).map(t => `<div class="theme-dot" data-theme="${t}" style="background:${themes[t].main}"></div>`).join('')}
                    </div>
                </div>
            </div>
        `;
        $('#extensions_settings').append(html);

        $('#catta-cfg-enabled').on('change', function() {
            settings.isEnabled = this.checked;
            saveData();
            location.reload();
        });

        $('#catta-cfg-bubble').on('change', function() {
            settings.showBubble = this.checked;
            $(`#${BUBBLE_ID}`).toggle(settings.showBubble);
            saveData();
        });

        $('.theme-dot').on('click', function() { applyTheme($(this).data('theme')); });
    }

    function buildBubble() {
        if (!settings.isEnabled || document.getElementById(BUBBLE_ID)) return;
        const bubble = document.createElement('div');
        bubble.id = BUBBLE_ID;
        bubble.style.top = settings.posBubble.top;
        bubble.style.left = settings.posBubble.left;
        bubble.style.display = settings.showBubble ? 'block' : 'none';
        document.body.appendChild(bubble);
        makeDraggable(bubble, null, true);
        
        let startX, startY;
        bubble.addEventListener('mousedown', (e) => { startX = e.clientX; startY = e.clientY; });
        bubble.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; });
        
        bubble.addEventListener('mouseup', handleBubbleClick);
        bubble.addEventListener('touchend', handleBubbleClick);

        function handleBubbleClick(e) {
            const clientX = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
            const clientY = e.type === 'touchend' ? e.changedTouches[0].clientY : e.clientY;
            
            if (Math.abs(clientX - startX) < 5 && Math.abs(clientY - startY) < 5) {
                togglePlayerWithSmartPos();
            }
        }
    }

    // --- ตรรกะเปิดหน้าต่างแบบฉลาด (หลบแป้นพิมพ์/เด้งเหนือปุ่ม) ---
    function togglePlayerWithSmartPos() {
        const win = $(`#${WIN_ID}`);
        if (win.is(':visible')) {
            win.fadeOut(200);
        } else {
            const bubble = $(`#${BUBBLE_ID}`);
            const isMobile = window.innerWidth < 600;
            
            if (isMobile) {
                // บนมือถือ ให้เด้งขึ้นมากลางจอค่อนไปทางบน เพื่อหลบแป้นพิมพ์
                win.css({
                    top: '15%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bottom: 'auto'
                });
            } else if (bubble.length && settings.showBubble) {
                // บนคอม ให้เด้งขึ้นเหนือไอคอนกลมๆ
                let bTop = bubble.offset().top;
                let bLeft = bubble.offset().left;
                win.css({
                    top: (bTop - win.outerHeight() - 20) + "px",
                    left: bLeft + "px",
                    transform: 'none'
                });
            }
            win.fadeIn(200);
        }
    }

    function buildPlayerWindow() {
        if (!settings.isEnabled || document.getElementById(WIN_ID)) return;

        const html = `
            <div id="${WIN_ID}" style="display: none; position: fixed; top: ${settings.posWin.top}; left: ${settings.posWin.left}; z-index: 10000;">
                <div class="cattamusic-header">
                    <span>🐾 Catta Music Player</span>
                    <button id="catta-close-win">×</button>
                </div>
                <div class="cattamusic-screen">
                    <div class="cattamusic-status-bar">
                        <span id="catta-time">00:00</span>
                        <span id="catta-vol">Vol: 3</span>
                        <span id="catta-track-count">0 tracks</span>
                    </div>
                    <div class="cattamusic-marquee-container">
                        <div id="catta-display-name" class="cattamusic-marquee">Catta Music — แมวส้มพร้อมลุย!</div>
                    </div>
                </div>
                <div class="cattamusic-controls">
                    <button id="catta-btn-loop" title="โหมดลูป"><i class="fa-solid fa-arrow-right"></i></button>
                    <button id="catta-btn-prev"><i class="fa-solid fa-backward-step"></i></button>
                    <button id="catta-btn-play"><i class="fa-solid fa-play"></i></button>
                    <button id="catta-btn-next"><i class="fa-solid fa-forward-step"></i></button>
                    <button id="catta-btn-voldown"><i class="fa-solid fa-volume-low"></i></button>
                    <button id="catta-btn-volup"><i class="fa-solid fa-volume-high"></i></button>
                </div>
                <div class="cattamusic-playlist">
                    <input type="text" id="catta-input-url" placeholder="URL เพลง .mp3 ...">
                    <button id="catta-btn-save" class="catta-btn-small">Add to List</button>
                    <div id="catta-list-display" class="catta-scroll-list"></div>
                </div>
            </div>
        `;
        $("body").append(html);
        makeDraggable(document.getElementById(WIN_ID), '.cattamusic-header');
        applyTheme(settings.theme);

        $("#catta-close-win").on('click', () => $(`#${WIN_ID}`).fadeOut(200));
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

    function applyTheme(themeName) {
        const T = themes[themeName] || themes.orange;
        const root = $(`#${WIN_ID}`);
        if (!root.length) return;
        root.css({ 'border-color': T.main, 'background-color': T.bg, 'color': T.text });
        root.find('.cattamusic-header').css('background-color', T.main);
        root.find('.cattamusic-screen').css({ 'background-color': T.screen, 'border-color': T.main });
        root.find('.cattamusic-controls button').css({ 'border-color': T.main, 'color': T.main });
        settings.theme = themeName;
        saveData();
    }

    function renderPlaylist() {
        const container = $("#catta-list-display");
        container.empty();
        playlist.forEach((track, i) => {
            const item = $(`<div class="playlist-item">
                <span class="${currentTrackIndex===i?'active-track':''}">${i+1}. ${track.name}</span>
                <span class="delete-track">×</span>
            </div>`);
            item.find('span:first').on('click', () => playTrack(i));
            item.find('.delete-track').on('click', (e) => { e.stopPropagation(); playlist.splice(i, 1); saveData(); renderPlaylist(); });
            container.append(item);
        });
        $("#catta-track-count").text(`${playlist.length} tracks`);
    }

    function playTrack(i) {
        if (i < 0 || i >= playlist.length) return;
        currentTrackIndex = i;
        audioPlayer.src = playlist[i].url;
        audioPlayer.volume = volume / 5;
        audioPlayer.play().catch(e => console.error("Playback failed:", e));
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

    function playNext() { if(playlist.length) playTrack((currentTrackIndex + 1) % playlist.length); }
    function playPrev() { if(playlist.length) playTrack((currentTrackIndex - 1 + playlist.length) % playlist.length); }

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
