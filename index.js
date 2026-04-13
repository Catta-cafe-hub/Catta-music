/**
 * Catta Music Player Extension for SillyTavern
 * ระบบหน้าต่างลากได้ และเพลย์ลิสต์เพลงจาก URL
 */

(function() {
    "use strict";

    const EXT_ID = "cattamusic";
    const WIN_ID = "cattamusic-player-window";
    const BTN_ID = "cattamusic-toggle-btn";
    const LS_PLAYLIST = "cattamusic_playlist";

    let playlist = [];
    let currentTrackIndex = -1;
    let audioPlayer = new Audio();
    let isPlaying = false;
    let volume = 3; // 1-5 ตามสเปคมารีส
    let loopMode = 0; // 0: No Loop, 1: Loop All, 2: Loop One, 3: Shuffle

    // โหลด Playlist จาก LocalStorage
    function loadPlaylist() {
        const saved = localStorage.getItem(LS_PLAYLIST);
        if (saved) {
            try { playlist = JSON.parse(saved); } catch(e) { playlist = []; }
        }
    }

    function savePlaylist() {
        localStorage.setItem(LS_PLAYLIST, JSON.stringify(playlist));
        updateStatus();
    }

    // ฟังก์ชันทำให้ลากได้ (Draggable) - เลียนแบบโครงสร้าง ST
    function makeDraggable(el) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = el.querySelector('.cattamusic-header');
        if (header) {
            header.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            el.style.top = (el.offsetTop - pos2) + "px";
            el.style.left = (el.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function buildToggleButton() {
        if (document.getElementById(BTN_ID)) return;
        const settingsHtml = `
            <div id="${BTN_ID}" class="list-group-item flex-container flex-align-center clickable">
                <i class="fa-solid fa-music"></i>
                <div class="extension_name">Catta Music Player</div>
            </div>
        `;
        $("#extensions_settings").append(settingsHtml);
        $(`#${BTN_ID}`).on("click", () => { $(`#${WIN_ID}`).toggle(); });
    }

    function buildPlayerWindow() {
        if (document.getElementById(WIN_ID)) return;

        const html = `
            <div id="${WIN_ID}" style="display: none; position: fixed; top: 100px; right: 20px; z-index: 10000;">
                <div class="cattamusic-ears"></div>
                <div class="cattamusic-header">
                    <span>🐾 Catta Music</span>
                    <button id="cattamusic-close-btn">×</button>
                </div>
                <div class="cattamusic-screen">
                    <div class="cattamusic-status-bar">
                        <span id="catta-time">00:00</span>
                        <span id="catta-vol">Vol: 3</span>
                        <span id="catta-track-count">0 tracks</span>
                    </div>
                    <div class="cattamusic-marquee-container">
                        <div id="catta-display-name" class="cattamusic-marquee">ยินดีต้อนรับสู่ Catta Music...</div>
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
                    <div style="font-size: 10px; margin-bottom: 5px; color: #ff9800; font-weight: bold;">[ Add MP3 Link ]</div>
                    <input type="text" id="catta-input-url" placeholder="วางลิ้งค์เพลงที่นี่..." style="width: 100%; font-size: 11px; padding: 4px; border: 1px solid #ff9800; border-radius: 4px; background: #fff;">
                    <button id="catta-btn-save-url" class="catta-btn-small" style="margin-top: 5px;">Save to List</button>
                    <div id="catta-list-display" style="max-height: 60px; overflow-y: auto; margin-top: 8px; font-size: 10px; border-top: 1px dashed #ff9800; padding-top: 5px;"></div>
                </div>
                <div class="cattamusic-tail"></div>
            </div>
        `;
        
        $("body").append(html);
        const winEl = document.getElementById(WIN_ID);
        makeDraggable(winEl);

        // Events
        $("#cattamusic-close-btn").on("click", () => { $(`#${WIN_ID}`).hide(); });
        
        $("#catta-btn-save-url").on("click", () => {
            const url = $("#catta-input-url").val().trim();
            if (url) {
                const name = url.split('/').pop() || "Unknown Track";
                playlist.push({ name, url });
                $("#catta-input-url").val("");
                savePlaylist();
                renderPlaylist();
            }
        });

        $("#catta-btn-play").on("click", togglePlay);
        $("#catta-btn-next").on("click", playNext);
        $("#catta-btn-prev").on("click", playPrev);
        $("#catta-btn-volup").on("click", () => { changeVolume(1); });
        $("#catta-btn-voldown").on("click", () => { changeVolume(-1); });
        $("#catta-btn-loop").on("click", changeLoopMode);

        setInterval(updateClock, 1000);
        renderPlaylist();
        updateStatus();
    }

    function updateClock() {
        const now = new Date();
        $("#catta-time").text(now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0'));
    }

    function updateStatus() {
        $("#catta-track-count").text(`${playlist.length} tracks`);
        $("#catta-vol").text(`Vol: ${volume}`);
    }

    function renderPlaylist() {
        const listContainer = $("#catta-list-display");
        listContainer.empty();
        playlist.forEach((item, index) => {
            const row = $(`<div style="padding: 2px 0; border-bottom: 0.5px solid #eee; display: flex; justify-content: space-between;">
                <span class="clickable" style="${currentTrackIndex === index ? 'color: #ff9800; font-weight: bold;' : ''}">${index + 1}. ${item.name}</span>
                <span class="clickable" style="color: red; padding: 0 5px;">×</span>
            </div>`);
            row.find('span:first').on("click", () => { playTrack(index); });
            row.find('span:last').on("click", () => { 
                playlist.splice(index, 1); 
                if (currentTrackIndex === index) stopPlay();
                savePlaylist(); 
                renderPlaylist(); 
            });
            listContainer.append(row);
        });
    }

    function playTrack(index) {
        if (index < 0 || index >= playlist.length) return;
        currentTrackIndex = index;
        audioPlayer.src = playlist[index].url;
        audioPlayer.volume = volume / 5;
        audioPlayer.play();
        isPlaying = true;
        $("#catta-btn-play").html('<i class="fa-solid fa-pause"></i>');
        $("#catta-display-name").text(playlist[index].name);
        renderPlaylist();
    }

    function togglePlay() {
        if (!audioPlayer.src && playlist.length > 0) {
            playTrack(0);
            return;
        }
        if (isPlaying) {
            audioPlayer.pause();
            $("#catta-btn-play").html('<i class="fa-solid fa-play"></i>');
        } else {
            audioPlayer.play();
            $("#catta-btn-play").html('<i class="fa-solid fa-pause"></i>');
        }
        isPlaying = !isPlaying;
    }

    function stopPlay() {
        audioPlayer.pause();
        audioPlayer.src = "";
        isPlaying = false;
        $("#catta-btn-play").html('<i class="fa-solid fa-play"></i>');
        $("#catta-display-name").text("Catta Music...");
    }

    function playNext() {
        if (playlist.length === 0) return;
        let next = currentTrackIndex + 1;
        if (next >= playlist.length) next = 0;
        playTrack(next);
    }

    function playPrev() {
        if (playlist.length === 0) return;
        let prev = currentTrackIndex - 1;
        if (prev < 0) prev = playlist.length - 1;
        playTrack(prev);
    }

    function changeVolume(delta) {
        volume = Math.min(5, Math.max(1, volume + delta));
        audioPlayer.volume = volume / 5;
        updateStatus();
    }

    function changeLoopMode() {
        loopMode = (loopMode + 1) % 4;
        const btn = $("#catta-btn-loop");
        btn.removeClass("catta-mode-off catta-mode-on");
        if (loopMode === 0) {
            btn.addClass("catta-mode-off").html('<i class="fa-solid fa-arrow-right"></i>');
        } else if (loopMode === 1) {
            btn.addClass("catta-mode-on").html('<i class="fa-solid fa-rotate"></i>');
        } else if (loopMode === 2) {
            btn.addClass("catta-mode-on").html('<i class="fa-solid fa-rotate"></i> <small style="position:absolute;font-size:8px;">1</small>');
        } else {
            btn.addClass("catta-mode-on").html('<i class="fa-solid fa-shuffle"></i>');
        }
    }

    // เมื่อจบเพลง
    audioPlayer.onended = () => {
        if (loopMode === 2) { // Loop One
            playTrack(currentTrackIndex);
        } else if (loopMode === 3) { // Shuffle
            playTrack(Math.floor(Math.random() * playlist.length));
        } else if (loopMode === 1) { // Loop All
            playNext();
        } else { // No Loop
            if (currentTrackIndex < playlist.length - 1) playNext();
            else stopPlay();
        }
    };

    function init() {
        loadPlaylist();
        buildToggleButton();
        buildPlayerWindow();
        console.log("[Catta Music] Advanced Loader ✓");
    }

    if (window.jQuery && $("#extensions_settings").length) { init(); }
    else {
        const interval = setInterval(() => {
            if (window.jQuery && $("#extensions_settings").length) { clearInterval(interval); init(); }
        }, 500);
    }
})();
