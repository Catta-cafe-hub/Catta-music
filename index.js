/**
 * Catta Music Player Extension for SillyTavern
 */

(function() {
    "use strict";

    const EXT_ID = "cattamusic";
    const WIN_ID = "cattamusic-player-window";
    const BTN_ID = "cattamusic-toggle-btn";

    // ฟังก์ชันสร้างปุ่มเมนูในหน้า Extensions
    function buildToggleButton() {
        if (document.getElementById(BTN_ID)) return;
        
        // เราจะสร้างตัวเลือกในเมนู Extensions (รูปจิ๊กซอว์)
        const settingsHtml = `
            <div id="${BTN_ID}" class="list-group-item flex-container flex-align-center clickable">
                <i class="fa-solid fa-music"></i>
                <div class="extension_name">Catta Music Player</div>
            </div>
        `;
        
        $("#extensions_settings").append(settingsHtml);

        $(`#${BTN_ID}`).on("click", () => {
            togglePlayerWindow();
        });
    }

    function togglePlayerWindow() {
        const win = document.getElementById(WIN_ID);
        if (win) {
            if (win.style.display === "none") {
                win.style.display = "flex";
            } else {
                win.style.display = "none";
            }
        }
    }

    // ฟังก์ชันสร้างหน้าต่างเครื่องเล่น
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
                        <div class="cattamusic-marquee">Catta Music Player — พร้อมรับคำสั่งเจ้าค่ะ...</div>
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
                    <div id="catta-url-list"></div>
                    <button id="catta-btn-add-url" class="catta-btn-small">+ เพิ่มลิ้งก์เพลง (.mp3)</button>
                </div>
                <div class="cattamusic-tail"></div>
            </div>
        `;
        
        $("body").append(html);

        $("#cattamusic-close-btn").on("click", () => {
            $(`#${WIN_ID}`).hide();
        });

        // อัปเดตเวลา
        setInterval(() => {
            const now = new Date();
            $("#catta-time").text(now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0'));
        }, 1000);
    }

    // รอให้ SillyTavern พร้อมแล้วค่อยรัน
    function init() {
        buildToggleButton();
        buildPlayerWindow();
        console.log("[Catta Music] Extension Loaded ✓");
    }

    // ตรวจสอบความพร้อมของ jQuery และ DOM
    if (window.jQuery && $("#extensions_settings").length) {
        init();
    } else {
        const interval = setInterval(() => {
            if (window.jQuery && $("#extensions_settings").length) {
                clearInterval(interval);
                init();
            }
        }, 500);
    }

})();
