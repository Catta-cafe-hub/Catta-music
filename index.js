/**
 * Catta Music Player Extension for SillyTavern
 * Developed for Catta-Cafe
 */

jQuery(async () => {
    "use strict";

    const EXT_ID = "cattamusic";
    const WIN_ID = "cattamusic-player-window";
    const BTN_ID = "cattamusic-toggle-btn";

    /* =========================================================
       1. สร้างปุ่มลอย (Floating Toggle Button) หรือในเมนูบน
       เราจะทำเป็นปุ่มลอยมุมขวาล่าง แบบเดียวกับที่มักจะใช้กัน
    ========================================================= */
    function buildToggleButton() {
        if (document.getElementById(BTN_ID)) return;
        const btn = document.createElement("button");
        btn.id = BTN_ID;
        btn.className = "menu_button";
        btn.innerHTML = `<i class="fa-solid fa-music"></i> <span class="cattamusic-badge">Catta</span>`;
        btn.title = "Catta Music Player";
        
        // แทรกลงในเมนูส่วนขยายด้านบนของ ST
        $("#extensions_info").append(btn);

        btn.addEventListener("click", () => {
            const win = document.getElementById(WIN_ID);
            if (win) {
                if (win.style.display === "none") {
                    win.style.display = "flex";
                } else {
                    win.style.display = "none";
                }
            }
        });
    }

    /* =========================================================
       2. สร้างหน้าต่างเครื่องเล่น (Player UI) สีส้ม/ขาว แมวส้ม
    ========================================================= */
    function buildPlayerWindow() {
        if (document.getElementById(WIN_ID)) return;

        const html = `
            <div id="${WIN_ID}" style="display: none;">
                <!-- พื้นที่สำหรับใส่ภาพขยับ หูแมว -->
                <div class="cattamusic-ears">
                    <div class="cat-ear left-ear"></div>
                    <div class="cat-ear right-ear"></div>
                </div>

                <!-- ส่วนบนสุดของหน้าต่าง -->
                <div class="cattamusic-header">
                    <span>🐾 Catta Music</span>
                    <button id="cattamusic-close-btn"><i class="fa-solid fa-xmark"></i></button>
                </div>

                <!-- หน้าจอแสดงผลฟอนต์พิมพ์ดีด -->
                <div class="cattamusic-screen">
                    <div class="cattamusic-status-bar">
                        <span id="catta-time">00:00</span>
                        <span id="catta-vol">Vol: 3</span>
                        <span id="catta-track-count">0 tracks</span>
                    </div>
                    <div class="cattamusic-marquee-container">
                        <div class="cattamusic-marquee">ยังไม่มีเพลงในรายการ...</div>
                    </div>
                </div>

                <!-- ปุ่มควบคุมเครื่องเล่น -->
                <div class="cattamusic-controls">
                    <button id="catta-btn-loop" title="โหมดลูป" class="catta-mode-off"><i class="fa-solid fa-arrow-right"></i></button>
                    <button id="catta-btn-prev" title="เพลงก่อนหน้า"><i class="fa-solid fa-backward-step"></i></button>
                    <button id="catta-btn-play" title="เล่น/หยุด"><i class="fa-solid fa-play"></i></button>
                    <button id="catta-btn-next" title="เพลงถัดไป"><i class="fa-solid fa-forward-step"></i></button>
                    <button id="catta-btn-voldown" title="ลดเสียง"><i class="fa-solid fa-volume-low"></i></button>
                    <button id="catta-btn-volup" title="เพิ่มเสียง"><i class="fa-solid fa-volume-high"></i></button>
                </div>

                <!-- พื้นที่สำหรับใส่ช่องกรอก URL เพลง -->
                <div class="cattamusic-playlist">
                    <div style="font-size: 12px; margin-bottom: 8px;">🔗 เพิ่มลิ้งก์เพลง (เช่น file.garden)</div>
                    <div id="catta-url-list">
                        <!-- ช่องใส่ URL จะงอกตรงนี้ -->
                    </div>
                    <button id="catta-btn-add-url" class="catta-btn-small">+ เพิ่มช่อง URL</button>
                </div>

                <!-- พื้นที่สำหรับใส่ภาพขยับ หางแมว -->
                <div class="cattamusic-tail"></div>
            </div>
        `;
        
        $("body").append(html);

        // ระบบปิดหน้าต่าง
        $("#cattamusic-close-btn").on("click", () => {
            $(`#${WIN_ID}`).css("display", "none");
        });

        // อัปเดตนาฬิกา
        setInterval(() => {
            const now = new Date();
            $("#catta-time").text(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
        }, 1000);
    }

    /* =========================================================
       เริ่มระบบ
    ========================================================= */
    buildToggleButton();
    buildPlayerWindow();

    console.log("[Catta Music] Extension loaded successfully ✓");
});
