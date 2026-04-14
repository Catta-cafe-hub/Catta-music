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
        "chat": { name: "Unknown", avatar: ICON_URL, tracks: [] }
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
        pink:     { main:'#ff6b9d', accent:'#ff9a56', dark:'#1a0a2e', card:'#2d1b54', text:'#f0e8ff', muted:'#b08ecf', glow:'rgba(255,107,157,0.4)',  dot:'rgba(255,107,157,0.8)'  },
        orange:   { main:'#ff9a56', accent:'#ffd93d', dark:'#1f0e00', card:'#2e1a00', text:'#fff0e0', muted:'#c4956b', glow:'rgba(255,154,86,0.4)',   dot:'rgba(255,154,86,0.9)'   },
        blue:     { main:'#4d96ff', accent:'#6bcb77', dark:'#050f2e', card:'#0d1f5c', text:'#e8f0ff', muted:'#7a9fd4', glow:'rgba(77,150,255,0.4)',   dot:'rgba(77,150,255,0.9)'   },
        mint:     { main:'#6bcb77', accent:'#4d96ff', dark:'#041a0a', card:'#082e14', text:'#e8ffe8', muted:'#7cb882', glow:'rgba(107,203,119,0.4)',  dot:'rgba(107,203,119,0.9)'  },
        purple:   { main:'#b388ff', accent:'#ff6b9d', dark:'#0d0025', card:'#1a0040', text:'#f0e8ff', muted:'#9b78d4', glow:'rgba(179,136,255,0.45)', dot:'rgba(179,136,255,0.9)'  },
        midnight: { main:'#4fc3f7', accent:'#81d4fa', dark:'#050a12', card:'#0d1525', text:'#e0f4ff', muted:'#6a9fb5', glow:'rgba(79,195,247,0.4)',   dot:'rgba(79,195,247,0.9)'   },
        latte:    { main:'#d4a574', accent:'#ff9a56', dark:'#1a1008', card:'#2e1c0c', text:'#fff0dc', muted:'#b08c6a', glow:'rgba(212,165,116,0.4)',  dot:'rgba(212,165,116,0.9)'  },
        dark:     { main:'#aaaaaa', accent:'#888888', dark:'#0a0a0a', card:'#1a1a1a', text:'#e0e0e0', muted:'#707070', glow:'rgba(180,180,180,0.2)',  dot:'rgba(200,200,200,0.7)'  },
        blood:    { main:'#ef5350', accent:'#ff7043', dark:'#1a0505', card:'#2d0808', text:'#ffe0e0', muted:'#b07070', glow:'rgba(239,83,80,0.45)',    dot:'rgba(239,83,80,0.9)'    },
        green:    { main:'#66bb6a', accent:'#a5d6a7', dark:'#051a05', card:'#0a2e0a', text:'#e0ffe0', muted:'#7cb87e', glow:'rgba(102,187,106,0.4)',  dot:'rgba(102,187,106,0.9)'  },
        cotton:   { main:'#ffb6c1', accent:'#a7c7e7', dark:'#1a0a1a', card:'#2a152a', text:'#ffe0e9', muted:'#d4a0b3', glow:'rgba(255,182,193,0.4)',  dot:'rgba(255,182,193,0.9)'  },
        peach:    { main:'#ffdab9', accent:'#ffb347', dark:'#1a100a', card:'#2a1a12', text:'#ffefe0', muted:'#d4aa8a', glow:'rgba(255,218,185,0.4)',  dot:'rgba(255,218,185,0.9)'  },
        sakura:   { main:'#f4a460', accent:'#ffc0cb', dark:'#1a0d0a', card:'#2a1812', text:'#ffe8e0', muted:'#d4a090', glow:'rgba(244,164,96,0.4)',   dot:'rgba(244,164,96,0.9)'   },
        sky:      { main:'#87cefa', accent:'#e0ffff', dark:'#050a1a', card:'#0d122a', text:'#e0f4ff', muted:'#8aa9c4', glow:'rgba(135,206,250,0.4)',  dot:'rgba(135,206,250,0.9)'  },
        vanilla:  { type:'light', main:'#ff75a0', accent:'#fbc2eb', dark:'#ffffff', card:'#fff0f5', text:'#5c4b51', muted:'#a89098', glow:'rgba(255,117,160,0.25)',  dot:'rgba(255,117,160,0.9)'  },
        snow:     { type:'light', main:'#64b5f6', accent:'#8fd9a8', dark:'#faffff', card:'#e8f4f8', text:'#4a5d6e', muted:'#8ca3b5', glow:'rgba(100,181,246,0.25)',   dot:'rgba(100,181,246,0.9)'   }
    };

    // ══════════════════════════════════════════════
    // 2. CSS STYLES — SillyTavern-safe, all !important
    // ══════════════════════════════════════════════
    if (!$('#cattamusic-inline-css').length) {
        const inlineCSS = `
        <link id="cattamusic-font" href="https://fonts.googleapis.com/css2?family=Itim&display=swap" rel="stylesheet">
        <style id="cattamusic-inline-css">

        /* ── KEYFRAMES ── */
        @keyframes cattaScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-100%)} }
        @keyframes cattaPulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.45;transform:scale(.7)} }
        @keyframes cattaEQ     { to{height:3px!important} }
        @keyframes cattaFloat  { 0%,100%{transform:translateY(0) rotate(0deg)} 40%{transform:translateY(-4px) rotate(-3deg)} 70%{transform:translateY(-2px) rotate(2deg)} }
        @keyframes cattaSlideIn{ from{opacity:0;transform:translateY(-10px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }

        /* ── PLAYER WINDOW ── */
        #cattamusic-player-window {
            position:fixed!important; z-index:10000!important;
            width:270px!important; border-radius:22px!important;
            overflow:hidden!important; user-select:none!important;
            font-family:'Itim',cursive!important;
            box-shadow:0 20px 60px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.06) inset!important;
        }

        /* ── HEADER ── */
        #cattamusic-player-window .cattamusic-header {
            display:flex!important; justify-content:space-between!important; align-items:center!important;
            padding:10px 12px 8px!important; cursor:grab!important;
            border-bottom:1px solid rgba(255,255,255,.07)!important;
        }
        #cattamusic-player-window .cattamusic-header:active { cursor:grabbing!important; }
        #cattamusic-player-window .catta-header-title {
            font-size:14px!important; font-weight:400!important;
            font-family:'Itim',cursive!important; letter-spacing:.3px!important;
        }
        #cattamusic-player-window .hdr-right {
            display:flex!important; align-items:center!important; gap:5px!important;
        }
        #catta-track-count {
            font-size:9px!important; font-family:'Itim',cursive!important;
            font-weight:400!important; letter-spacing:.5px!important;
        }
        #catta-btn-minimize, #catta-close-win {
            width:22px!important; height:22px!important; border:none!important;
            border-radius:7px!important; cursor:pointer!important;
            display:flex!important; align-items:center!important; justify-content:center!important;
            font-size:13px!important; line-height:1!important; transition:all .2s!important;
            padding:0!important; box-shadow:none!important;
        }
        #catta-btn-minimize { background:rgba(255,255,255,.09)!important; }
        #catta-close-win    { background:rgba(255,255,255,.06)!important; }
        #catta-btn-minimize:hover { background:rgba(255,107,157,.25)!important; }
        #catta-close-win:hover    { background:rgba(239,83,80,.25)!important; color:#ef5350!important; }

        /* ── COVER / BANNER ── */
        #catta-banner-container {
            display:flex!important; align-items:center!important; gap:11px!important;
            padding:11px 13px 9px!important;
            border-bottom:1px solid rgba(255,255,255,.06)!important;
        }
        #catta-cover-img {
            width:52px!important; height:52px!important; border-radius:13px!important;
            object-fit:cover!important; flex-shrink:0!important;
            box-shadow:0 6px 20px rgba(0,0,0,.5)!important;
            transition:transform .3s!important;
        }
        #catta-cover-img:hover { transform:scale(1.05) rotate(-2deg)!important; }
        #catta-cover-title {
            font-size:13px!important; font-weight:400!important; font-family:'Itim',cursive!important;
            white-space:nowrap!important; overflow:hidden!important; text-overflow:ellipsis!important;
            margin-bottom:2px!important;
        }
        #catta-mood-row { display:flex!important; gap:4px!important; margin-top:4px!important; flex-wrap:wrap!important; }
        #catta-mood-row span {
            font-size:9px!important; padding:2px 8px!important; border-radius:20px!important;
            font-family:'Itim',cursive!important; border:1px solid!important;
        }

        /* Marquee */
        .cattamusic-marquee-wrapper {
            width:100%!important; overflow:hidden!important; white-space:nowrap!important; position:relative!important;
        }
        .cattamusic-marquee {
            display:inline-block!important; padding-left:100%!important; font-size:10px!important;
            font-family:'Itim',cursive!important; font-weight:400!important; letter-spacing:.3px!important;
            animation:cattaScroll 14s linear infinite!important;
        }

        /* ── STATUS BAR ── */
        #cattamusic-player-window .cattamusic-screen {
            padding:4px 13px!important; display:flex!important;
            border-top:none!important; border-left:none!important; border-right:none!important;
        }
        #cattamusic-player-window .cattamusic-status-bar {
            display:flex!important; justify-content:space-between!important; align-items:center!important;
            width:100%!important; font-size:9px!important; font-family:'Itim',cursive!important; font-weight:400!important;
        }
        #catta-play-dot {
            width:6px!important; height:6px!important; border-radius:50%!important;
            animation:cattaPulse 2s ease-in-out infinite!important;
        }

        /* ── CONTROLS ── */
        #cattamusic-player-window .cattamusic-controls {
            display:flex!important; align-items:center!important; justify-content:space-around!important;
            padding:9px 12px 7px!important; border-bottom:1px solid rgba(255,255,255,.06)!important;
        }
        #cattamusic-player-window .cattamusic-controls button {
            background:none!important; border:none!important; cursor:pointer!important;
            width:34px!important; height:34px!important; border-radius:50%!important;
            display:flex!important; align-items:center!important; justify-content:center!important;
            font-size:13px!important; transition:all .2s cubic-bezier(.34,1.56,.64,1)!important;
            padding:0!important; box-shadow:none!important;
        }
        #cattamusic-player-window .cattamusic-controls button:hover {
            transform:scale(1.12)!important;
        }
        #catta-btn-play {
            width:46px!important; height:46px!important; border-radius:50%!important;
            color:#fff!important; font-size:15px!important;
        }
        #catta-btn-play:hover { transform:scale(1.07)!important; }

        /* ── TABS ── */
        #cattamusic-player-window .cattamusic-tabs {
            display:flex!important; border-bottom:1px solid rgba(255,255,255,.06)!important;
            padding:0 8px!important; gap:2px!important;
        }
        #cattamusic-player-window .cattamusic-tabs button {
            flex:1!important; border:none!important; padding:7px 3px!important;
            font-size:11px!important; cursor:pointer!important;
            font-family:'Itim',cursive!important; font-weight:400!important;
            background:transparent!important; transition:all .2s!important;
            border-bottom:2px solid transparent!important; margin-bottom:-1px!important;
            box-shadow:none!important;
        }
        #catta-btn-toggle-tools {
            flex:none!important; background:none!important; border:none!important;
            cursor:pointer!important; padding:0 10px!important; font-size:13px!important;
            border-left:1px solid rgba(255,255,255,.07)!important;
            transition:color .2s!important; box-shadow:none!important;
        }

        /* ── PLAYLIST ── */
        #cattamusic-player-window .cattamusic-playlist {
            background:transparent!important;
        }
        #catta-list-display {
            max-height:120px!important; overflow-y:auto!important; padding:4px 0!important;
        }
        #catta-list-display::-webkit-scrollbar { width:3px!important; }
        #catta-list-display::-webkit-scrollbar-thumb { border-radius:3px!important; }

        .playlist-item {
            display:flex!important; align-items:center!important; gap:8px!important;
            padding:6px 12px!important; cursor:pointer!important;
            font-family:'Itim',cursive!important; font-size:11px!important; font-weight:400!important;
            transition:all .15s!important; border-left:2px solid transparent!important;
            border-radius:0!important; margin:0!important; color:var(--catta-text, #fff)!important;
        }
        .playlist-item:hover { background:rgba(255,107,157,.07)!important; }
        .playlist-item.active-track { border-left-width:2px!important; border-left-style:solid!important; }
        .playlist-item .track-num-badge {
            width:16px!important; text-align:center!important;
            font-size:10px!important; flex-shrink:0!important; font-family:'Itim',cursive!important;
        }
        .playlist-item .track-name-text {
            flex:1!important; white-space:nowrap!important;
            overflow:hidden!important; text-overflow:ellipsis!important;
            font-family:'Itim',cursive!important;
        }
        .playlist-item .del-btn {
            color:var(--c-bd, rgba(255,255,255,.18))!important; cursor:pointer!important;
            font-size:14px!important; padding:0 3px!important;
            transition:color .2s!important; flex-shrink:0!important;
            font-family:sans-serif!important;
        }
        .playlist-item .del-btn:hover { color:#ff6b9d!important; }

        /* EQ bars */
        .catta-eq {
            display:inline-flex!important; align-items:flex-end!important;
            gap:2px!important; height:14px!important; flex-shrink:0!important; width:16px!important;
        }
        .catta-eq span {
            width:3px!important; border-radius:2px!important;
            animation:cattaEQ .55s ease-in-out infinite alternate!important;
        }
        .catta-eq span:nth-child(1){height:8px!important;animation-delay:0s!important}
        .catta-eq span:nth-child(2){height:12px!important;animation-delay:.15s!important}
        .catta-eq span:nth-child(3){height:5px!important;animation-delay:.3s!important}

        /* ── TOOLS (inputs/selects) ── */
        #catta-tools-container {
            border-bottom:1px solid rgba(255,255,255,.06)!important;
        }
        .catta-manager-row { display:flex!important; flex-direction:column!important; gap:5px!important; }
        #catta-tools-container input,
        #catta-tools-container select {
            background:rgba(255,255,255,.08)!important; color:#f0e8ff!important;
            border:1px solid rgba(255,255,255,.15)!important; border-radius:10px!important;
            padding:6px 10px!important; font-size:11px!important;
            font-family:'Itim',cursive!important; outline:none!important;
            transition:border-color .2s!important; width:auto!important;
            box-shadow:none!important;
        }
        #catta-tools-container input:focus,
        #catta-tools-container select:focus { border-color:#ff6b9d!important; }
        #catta-tools-container input::placeholder { color:rgba(255,255,255,.3)!important; }

        .catta-btn-small {
            border:none!important; color:#fff!important; padding:6px 10px!important;
            border-radius:10px!important; font-family:'Itim',cursive!important;
            font-size:11px!important; cursor:pointer!important;
            transition:all .2s!important; white-space:nowrap!important;
            box-shadow:none!important;
        }
        .catta-btn-small:hover { filter:brightness(1.15)!important; transform:translateY(-1px)!important; }
        .catta-btn-small:active { transform:scale(.96)!important; }

        /* ── MINI BAR ── */
        #catta-mini-bar {
            align-items:center!important; gap:8px!important;
            padding:8px 12px!important; border-top:1px solid rgba(255,255,255,.06)!important;
        }
        #catta-mini-img {
            width:30px!important; height:30px!important; border-radius:8px!important;
            object-fit:cover!important; flex-shrink:0!important;
        }
        #catta-mini-title {
            font-size:11px!important; font-family:'Itim',cursive!important;
            white-space:nowrap!important; overflow:hidden!important; text-overflow:ellipsis!important;
        }
        #catta-mini-sub {
            font-size:9px!important; font-family:'Itim',cursive!important;
            letter-spacing:.3px!important; margin-top:1px!important;
        }
        #catta-mini-prev, #catta-mini-next, #catta-mini-play {
            background:none!important; border:none!important;
            cursor:pointer!important; padding:3px 5px!important;
            border-radius:6px!important; transition:all .2s!important;
            font-size:13px!important; box-shadow:none!important;
        }
        #catta-mini-play { font-size:16px!important; }
        #catta-mini-play:hover { transform:scale(1.12)!important; }

        /* ── INLINE MUSIC PILL (in chat) ── */
        .catta-inline-music {
            display:inline-flex!important; align-items:center!important; gap:10px!important;
            background:rgba(20,10,40,.9)!important; border:1px solid rgba(255,107,157,.4)!important;
            color:#fff!important; padding:8px 16px!important; border-radius:20px!important;
            cursor:pointer!important; font-family:'Itim',cursive!important; font-size:13px!important;
            box-shadow:0 4px 16px rgba(0,0,0,.35)!important;
            transition:all .25s cubic-bezier(.34,1.56,.64,1)!important; margin:5px 0!important;
        }
        .catta-inline-music:hover {
            transform:translateY(-3px)!important;
            box-shadow:0 10px 28px rgba(255,107,157,.3)!important;
        }
        .catta-inline-music .music-icon { font-size:18px!important; }
        .catta-inline-music .music-info { display:flex!important; flex-direction:column!important; line-height:1.3!important; }
        .catta-inline-music .music-title { font-weight:400!important; color:#fff!important; font-family:'Itim',cursive!important; }
        .catta-inline-music .music-status { font-size:9px!important; text-transform:uppercase!important; letter-spacing:1px!important; font-family:'Itim',cursive!important; }

        /* ── SETTINGS ── */
        .cattamusic-settings-block {
            border-radius:14px!important; padding:14px!important; margin:10px 0!important;
            font-family:'Itim',cursive!important;
        }
        .cattamusic-settings-block h4 { font-size:14px!important; font-family:'Itim',cursive!important; margin-bottom:8px!important; }
        .cattamusic-settings-block label { font-family:'Itim',cursive!important; font-size:13px!important; }
        .theme-selectors { display:flex!important; gap:7px!important; flex-wrap:wrap!important; margin-top:8px!important; }
        .theme-dot {
            width:24px!important; height:24px!important; border-radius:50%!important;
            cursor:pointer!important; border:2px solid rgba(255,255,255,.25)!important;
            box-shadow:0 2px 8px rgba(0,0,0,.3)!important;
            transition:all .2s cubic-bezier(.34,1.56,.64,1)!important;
        }
        .theme-dot:hover { transform:scale(1.22)!important; border-color:#fff!important; }

        /* BUBBLE */
        #cattamusic-bubble { border-radius:50%!important; transition:transform .25s,filter .2s!important; }
        #cattamusic-bubble:hover {
            transform:scale(1.12) rotate(-5deg)!important;
            animation:none!important;
        }

        /* RANGE SLIDER */
        input[type=range] {
            -webkit-appearance: none!important;
            background: var(--c-bd, rgba(255,255,255,0.2))!important;
            border-radius: 2px!important;
            outline: none!important;
        }
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none!important;
            width: 10px!important;
            height: 10px!important;
            border-radius: 50%!important;
            background: var(--catta-text, #fff)!important;
            cursor: pointer!important;
            box-shadow: 0 0 5px rgba(0,0,0,0.2)!important;
        }

        /* MINIMIZED STATE */
        @keyframes cattaSpin { 100% { transform: rotate(360deg); } }
        #cattamusic-player-window.minimized {
            width: fit-content !important;
            min-width: 180px !important;
            max-width: 250px !important;
            border-radius: 40px !important;
            padding: 0 !important;
            background: var(--c-min-bg, rgba(18, 18, 24, 0.9)) !important;
            backdrop-filter: blur(12px) !important;
            border: 1px solid var(--c-bd, rgba(255,255,255,0.08)) !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2) !important;
        }
        #cattamusic-player-window.minimized .cattamusic-header,
        #cattamusic-player-window.minimized #catta-playlist-selector,
        #cattamusic-player-window.minimized #catta-banner-container,
        #cattamusic-player-window.minimized .cattamusic-screen,
        #cattamusic-player-window.minimized .cattamusic-controls,
        #cattamusic-player-window.minimized .cattamusic-tabs,
        #cattamusic-player-window.minimized .cattamusic-playlist {
            display: none !important;
        }
        #cattamusic-player-window:not(.minimized) #catta-mini-bar {
            display: none !important;
        }
        #cattamusic-player-window.minimized #catta-mini-bar {
            background: transparent !important;
            padding: 5px 12px 5px 5px !important;
            cursor: grab !important;
            display: flex !important;
            gap: 8px !important;
            align-items: center !important;
            border-top: none !important;
        }
        #cattamusic-player-window.minimized #catta-mini-bar:active {
            cursor: grabbing !important;
        }
        #cattamusic-player-window.minimized #catta-mini-img {
            width: 36px !important;
            height: 36px !important;
            border-radius: 50% !important;
            object-fit: cover !important;
            flex-shrink: 0 !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
            cursor: pointer;
            animation: cattaSpin 10s linear infinite;
            animation-play-state: paused;
        }
        #cattamusic-player-window.minimized.playing #catta-mini-img {
            animation-play-state: running;
        }
        #cattamusic-player-window.minimized .catta-mini-progress-row {
            display: none !important;
        }
        #cattamusic-player-window.minimized #catta-mini-title {
            font-size: 13px !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
        }
        #cattamusic-player-window.minimized button {
            padding: 2px 4px !important;
            font-size: 13px !important;
        }
        #cattamusic-player-window.minimized #catta-mini-play {
            font-size: 16px !important;
            padding: 2px 6px !important;
        }

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
        if (!charPlaylists["chat"]) charPlaylists["chat"] = { name: "Unknown", avatar: ICON_URL, tracks: [] };
    }

function saveData() {
        localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
        localStorage.setItem(LS_USER_PLAYLISTS, JSON.stringify(userPlaylists));
        localStorage.setItem(LS_CHAR_PLAYLISTS, JSON.stringify(charPlaylists));

        // ระบบ Cloud Sync: ส่งข้อมูลอัปเดตไปที่ Casa DB ทันที
        const uid = localStorage.getItem('catta_uid') || localStorage.getItem('dante_uid');
        if (uid && isAuthorized) {
            fetch(`${settings.apiUrl}/v1/music/save_playlist`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: uid, user_playlists: userPlaylists, char_playlists: charPlaylists })
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    console.log("[CattaMusic] ☁️ Auto-Saved to Cloud");
                    // แจ้งเตือนเล็กๆ ว่าเซฟลงคลาวด์แล้ว
                    const marquee = $("#catta-display-name");
                    if (marquee.text() !== "☁️ Auto-Saved to Cloud") {
                        const old = marquee.text();
                        marquee.text("☁️ อัปเดตคลาวด์แล้ว!");
                        setTimeout(() => marquee.text(old), 3000);
                    }
                } else {
                    console.error("[CattaMusic] ☁️ Save Failed:", data.error);
                }
            })
            .catch(e => console.error("[CattaMusic] Cloud Sync Error:", e));
        }
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

    function getTargetChar() {
        // 1. ลองดึงจากแชทปัจจุบันที่กำลังคุยอยู่
        let activeChar = getActiveCharInfo();
        if (activeChar) return activeChar;
        
        // 2. ถ้าดึงไม่ได้ (เช่น แชทกลุ่ม หรือเทสระบบ) แต่ผู้ใช้ 'เลือก' ตัวละครจากรายการที่ค้นหาไว้แล้ว ให้ยึดตัวนั้น
        if (viewingTab === 'char' && viewingId && viewingId !== 'chat' && charPlaylists[viewingId]) {
            return { id: viewingId, name: charPlaylists[viewingId].name, avatar: charPlaylists[viewingId].avatar };
        }
        
        // 3. ไม่รู้เลยจริงๆ
        return { id: 'chat', name: charPlaylists['chat']?.name || 'Unknown', avatar: charPlaylists['chat']?.avatar || ICON_URL };
    }

    function addTrackToActiveChar(trackName, trackUrl, mood) {
        let target = getTargetChar();
        let targetId = target.id;
        
        if (!charPlaylists[targetId]) {
            charPlaylists[targetId] = { 
                name: target.name, 
                avatar: target.avatar, 
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
                        <div class="music-icon"><i class="fa-solid fa-compact-disc"></i></div>
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

        // A. Audio Catcher (จับทุกลิงก์เสียง)
        let foundAnyAudio = false;
        let firstAudioUrl = null;

        // 1. จับแบบเจาะจง (มีปุ่ม inline)
        const musicMatch = originalText.match(CHAT_MUSIC_REGEX);
        if (musicMatch) {
            let targetId = addTrackToActiveChar(musicMatch[1], musicMatch[2], "shared");
            firstAudioUrl = musicMatch[2].trim();
            foundAnyAudio = true;
        } else {
            // 2. จับแบบหว่านแหหาลิงก์ไฟล์เสียงทั้งหมด (กรณีบอทพิมพ์ลิงก์มาดิบๆ)
            const audioRegex = /(https?:\/\/[^\s\)]+\.(?:mp3|wav|ogg|m4a))/gi;
            let audioMatches;
            let extractedTracks = [];
            
            while ((audioMatches = audioRegex.exec(originalText)) !== null) {
                extractedTracks.push(audioMatches[1]);
            }

            if (extractedTracks.length > 0) {
                firstAudioUrl = extractedTracks[0];
                foundAnyAudio = true;
                
                // ยัดลงเพลย์ลิสต์จากหลังมาหน้า เพื่อให้เพลงแรกเด้งขึ้นไปอยู่บนสุดพอดี
                for (let i = extractedTracks.length - 1; i >= 0; i--) {
                    let url = extractedTracks[i];
                    let filename = url.split('/').pop();
                    try { filename = decodeURIComponent(filename); } catch(e) {}
                    filename = filename.replace(/\.(mp3|wav|ogg|m4a)$/i, '').replace(/[-_]/g, ' ');
                    
                    addTrackToActiveChar(filename, url, "auto-detect");
                }
            }
        }

        // เล่นเพลงทันทีถ้าเจอลิงก์ในแชท (ไม่ว่าจะจากปุ่มหรือจากลิงก์ดิบๆ)
        if (foundAnyAudio && firstAudioUrl) {
            let target = getTargetChar();
            let targetId = target.id;
            
            const win = $(`#${WIN_ID}`);
            if (!win.is(':visible') && settings.showBubble) {
                win.fadeIn(200);
                $(`#${BUBBLE_ID}`).fadeOut(200);
            }
            
            switchTab('char', targetId);
            playTrack(charPlaylists[targetId].tracks.findIndex(t => t.url === firstAudioUrl), 'char', targetId);
            notifyUser("📥 ดึงเพลงจากแชทและเริ่มเล่นทันที!");
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
                let target = getTargetChar();
                let targetId = target.id;
                
                if (!charPlaylists[targetId]) {
                    charPlaylists[targetId] = { name: target.name, avatar: target.avatar, tracks: [] };
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
            win.fadeIn(200);
            $(`#${BUBBLE_ID}`).fadeOut(200);
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
        
        let sX, sY, isToggling = false;
        bubble.addEventListener('mousedown', (e)=>{sX=e.clientX; sY=e.clientY;});
        bubble.addEventListener('touchstart', (e)=>{sX=e.touches[0].clientX; sY=e.touches[0].clientY;});
        const click = (e) => {
            const cX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
            const cY = e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY;
            if (Math.abs(cX-sX)<5 && Math.abs(cY-sY)<5) {
                if (isToggling) return;
                isToggling = true;
                togglePlayerSmart();
                setTimeout(() => isToggling = false, 300);
            }
        };
        bubble.addEventListener('mouseup', click); bubble.addEventListener('touchend', click);
    }

    function buildPlayerWindow() {
        if (document.getElementById(WIN_ID)) return;
        const T = themes[settings.theme] || themes.pink;
        const winPosStyle = settings.posWindow ? `top:${settings.posWindow.top};left:${settings.posWindow.left};transform:none;` : `top:12px;left:50%;transform:translateX(-50%);`;
        
        const S = {
            win:  `display:none;position:fixed!important;z-index:10000!important;${winPosStyle}width:270px;border-radius:22px;overflow:hidden;font-family:'Itim',cursive;background:${T.dark};border:1.5px solid ${T.main}44;box-shadow:0 20px 60px rgba(0,0,0,.8),0 0 40px ${T.glow},0 0 0 1px rgba(255,255,255,.05) inset;`,
            hdr:  `display:flex;justify-content:space-between;align-items:center;padding:10px 12px 8px;cursor:grab;background:var(--c-bg-2, rgba(0,0,0,.25));border-bottom:1px solid var(--c-bd, rgba(255,255,255,.07));`,
            ttl:  `font-size:14px;font-family:'Itim',cursive;background:linear-gradient(90deg,${T.main},${T.accent});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`,
            hdR:  `display:flex;align-items:center;gap:5px;`,
            cnt:  `font-size:9px;color:${T.muted};font-family:'Itim',cursive;`,
            minB: `width:22px;height:22px;border:none!important;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1;padding:0;box-shadow:none!important;background:var(--c-bg-inp, rgba(255,255,255,.09));color:var(--catta-text-muted, ${T.muted});transition:all .2s;`,
            cls:  `width:22px;height:22px;border:none!important;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;padding:0;box-shadow:none!important;background:var(--c-bg-1, rgba(255,255,255,.06));color:var(--catta-text-muted, ${T.muted});transition:all .2s;`,
            mini: `align-items:center;gap:8px;padding:8px 12px;background:var(--c-bg-2, rgba(0,0,0,.2));border-top:1px solid var(--c-bd, rgba(255,255,255,.07));`,
            mImg: `width:30px;height:30px;border-radius:8px;object-fit:cover;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.5);`,
            mTtl: `font-size:11px;font-family:'Itim',cursive;color:${T.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`,
            mSub: `font-size:9px;font-family:'Itim',cursive;color:${T.muted};margin-top:1px;`,
            mBtn: `background:none;border:none!important;cursor:pointer;padding:3px 5px;border-radius:6px;transition:all .2s;box-shadow:none!important;font-size:13px;color:var(--catta-text-muted, ${T.muted});`,
            mPlay:`background:none;border:none!important;cursor:pointer;padding:3px 5px;border-radius:6px;transition:all .2s;box-shadow:none!important;font-size:17px;color:${T.main};`,
            ban:  `display:flex;align-items:center;gap:11px;padding:11px 13px 9px;border-bottom:1px solid var(--c-bd, rgba(255,255,255,.06));background:linear-gradient(180deg,${T.main}12,transparent);`,
            cov:  `width:52px;height:52px;border-radius:13px;object-fit:cover;flex-shrink:0;box-shadow:0 6px 20px rgba(0,0,0,.5);cursor:pointer;`,
            cTtl: `font-size:13px;font-family:'Itim',cursive;color:var(--catta-text, ${T.text});white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;`,
            scr:  `padding:4px 13px;display:flex;background:var(--c-bg-2, rgba(0,0,0,.22));`,
            sBar: `display:flex;justify-content:space-between;align-items:center;width:100%;font-size:9px;font-family:'Itim',cursive;color:var(--catta-text-muted, ${T.muted});`,
            dot:  `width:6px;height:6px;border-radius:50%;background:${T.main};opacity:0;`,
            ctrl: `display:flex;align-items:center;justify-content:space-around;padding:9px 12px 7px;border-bottom:1px solid var(--c-bd, rgba(255,255,255,.06));background:var(--c-bg-2, rgba(0,0,0,.12));`,
            cBtn: `background:none!important;border:none!important;cursor:pointer;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all .2s;padding:0;box-shadow:none!important;color:var(--catta-text-muted, ${T.muted});`,
            pBtn: `border:none!important;cursor:pointer;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;transition:all .2s;padding:0;color:#fff!important;background:linear-gradient(135deg,${T.main},${T.accent});box-shadow:0 6px 20px ${T.glow};`,
            tabs: `display:flex;border-bottom:1px solid var(--c-bd, rgba(255,255,255,.06));padding:0 8px;gap:2px;background:var(--c-bg-2, rgba(0,0,0,.15));`,
            tab:  `flex:1;border:none!important;padding:7px 3px;font-size:11px;cursor:pointer;font-family:'Itim',cursive;background:transparent!important;color:var(--catta-text-muted, ${T.muted});transition:all .2s;border-bottom:2px solid transparent;margin-bottom:-1px;box-shadow:none!important;`,
            tTl:  `flex:none;background:none!important;border:none!important;cursor:pointer;padding:0 10px;font-size:13px;border-left:1px solid var(--c-bd, rgba(255,255,255,.07));color:var(--catta-text-muted, ${T.muted});transition:color .2s;box-shadow:none!important;`,
            pl:   `background:transparent;`,
            tool: `display:none;padding:8px 10px;flex-direction:column;gap:5px;border-bottom:1px solid var(--c-bd, rgba(255,255,255,.07));background:var(--c-bg-2, rgba(0,0,0,.2));`,
            inp:  `background:var(--c-bg-inp, rgba(255,255,255,.08))!important;color:var(--catta-text, ${T.text})!important;border:1px solid var(--c-bd, rgba(255,255,255,.15))!important;border-radius:10px!important;padding:6px 10px!important;font-size:11px!important;font-family:'Itim',cursive!important;outline:none!important;box-shadow:none!important;`,
            sel:  `background:var(--c-bg-inp, rgba(255,255,255,.08))!important;color:var(--catta-text, ${T.text})!important;border:1px solid var(--c-bd, rgba(255,255,255,.15))!important;border-radius:10px!important;padding:6px 10px!important;font-size:11px!important;font-family:'Itim',cursive!important;outline:none!important;box-shadow:none!important;flex-grow:1;`,
            sB:   `border:none!important;color:#fff!important;padding:6px 10px;border-radius:10px;font-family:'Itim',cursive;font-size:11px;cursor:pointer;box-shadow:none!important;white-space:nowrap;flex-shrink:0;`,
            lst:  `max-height:120px;overflow-y:auto;padding:4px 0;`,
        };
        const html = `
        <div id="${WIN_ID}" style="${S.win}">
            <div class="cattamusic-header" style="${S.hdr}">
                <span class="catta-header-title" style="${S.ttl}">🐾 Catta Music</span>
                <div style="${S.hdR}">
                    <span id="catta-track-count" style="${S.cnt}">0 tracks</span>
                    <button id="catta-btn-minimize" style="${S.minB}" title="ย่อ"><i class="fa-solid fa-compress"></i></button>
                    <button id="catta-close-win" style="${S.cls}">×</button>
                </div>
            </div>
            <div id="catta-mini-bar" style="${S.mini}">
                <img id="catta-mini-img" src="${ICON_URL}" style="${S.mImg}">
                <div style="flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;justify-content:center;">
                    <div id="catta-mini-title" style="${S.mTtl}">Catta Music</div>
                    <div class="catta-mini-progress-row" style="display:flex;align-items:center;gap:5px;margin-top:2px;">
                        <span id="catta-mini-time" style="font-size:8px;color:${T.muted};">00:00</span>
                        <input type="range" id="catta-mini-progress" min="0" max="100" value="0" style="flex:1;height:3px;">
                    </div>
                </div>
                <button id="catta-mini-prev" style="${S.mBtn}"><i class="fa-solid fa-backward-step"></i></button>
                <button id="catta-mini-play" style="${S.mPlay}"><i class="fa-solid fa-play"></i></button>
                <button id="catta-mini-next" style="${S.mBtn}"><i class="fa-solid fa-forward-step"></i></button>
                <button id="catta-btn-maximize" style="${S.mBtn}" title="ขยาย"><i class="fa-solid fa-expand"></i></button>
            </div>
            <div id="catta-banner-container" style="${S.ban}">
                <img id="catta-cover-img" src="${ICON_URL}" style="${S.cov}" title="คลิกเพื่อเปลี่ยนรูป (เฉพาะส่วนตัว)">
                <div style="flex:1;min-width:0;overflow:hidden;">
                    <div id="catta-cover-title" style="${S.cTtl}">Catta Music</div>
                    <div class="cattamusic-marquee-wrapper" style="width:100%;overflow:hidden;white-space:nowrap;">
                        <div id="catta-display-name" class="cattamusic-marquee" style="display:inline-block;padding-left:100%;font-size:10px;font-family:'Itim',cursive;color:${T.main};animation:cattaScroll 14s linear infinite;">✨ Ready to play!</div>
                    </div>
                    <div id="catta-mood-row" style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;"></div>
                </div>
            </div>
            <div class="cattamusic-screen" style="${S.scr}">
                <div class="cattamusic-status-bar" style="${S.sBar}">
                    <span id="catta-song-time">00:00</span>
                    <input type="range" id="catta-progress" min="0" max="100" value="0" style="flex:1; margin:0 8px; height:4px;">
                    <span id="catta-song-duration">00:00</span>
                </div>
            </div>
            <div class="cattamusic-controls" style="${S.ctrl}">
                <button id="catta-btn-loop"    style="${S.cBtn}" title="วนซ้ำ"><i class="fa-solid fa-arrow-right"></i></button>
                <button id="catta-btn-prev"    style="${S.cBtn}" title="ก่อนหน้า"><i class="fa-solid fa-backward-step"></i></button>
                <button id="catta-btn-play"    style="${S.pBtn}"><i class="fa-solid fa-play"></i></button>
                <button id="catta-btn-next"    style="${S.cBtn}" title="ถัดไป"><i class="fa-solid fa-forward-step"></i></button>
                <button id="catta-btn-voldown" style="${S.cBtn}"><i class="fa-solid fa-volume-low"></i></button>
                <button id="catta-btn-volup"   style="${S.cBtn}"><i class="fa-solid fa-volume-high"></i></button>
            </div>
            <div class="cattamusic-tabs" style="${S.tabs}">
                <button id="catta-tab-user" style="${S.tab}">👤 ส่วนตัว</button>
                <button id="catta-tab-char" style="${S.tab}">🐱 ตัวละคร</button>
                <button id="catta-btn-toggle-tools" style="${S.tTl}" title="จัดการ"><i class="fa-solid fa-sliders"></i></button>
            </div>
            <div class="cattamusic-playlist" style="${S.pl}">
                <div id="catta-playlist-selector" style="padding:6px 10px; background:var(--c-bg-2, rgba(0,0,0,0.1)); border-bottom:1px solid var(--c-bd, rgba(255,255,255,0.06));">
                    <select id="catta-user-sel" style="${S.sel}width:100%;display:none;"></select>
                    <select id="catta-char-sel" style="${S.sel}width:100%;display:none;"></select>
                </div>
                <div id="catta-tools-container" style="${S.tool}">
                    <!-- User Playlist Tools -->
                    <div id="catta-user-tools" style="display:none;flex-direction:column;gap:5px;">
                        <div style="display:flex;gap:5px;">
                            <input type="text" id="catta-new-user-name" placeholder="ตั้งชื่อเพลย์ลิสต์ส่วนตัวใหม่..." style="${S.inp}flex-grow:1;min-width:0;">
                            <button id="catta-btn-new-user" class="catta-btn-small" style="${S.sB}background:#1b5e20;" title="สร้างใหม่"><i class="fa-solid fa-plus"></i> สร้าง</button>
                        </div>
                        <button id="catta-btn-del-user" class="catta-btn-small" style="${S.sB}background:#b71c1c;width:100%;" title="ลบเพลย์ลิสต์ที่เลือกอยู่"><i class="fa-solid fa-trash"></i> ลบเพลย์ลิสต์ปัจจุบัน</button>
                    </div>

                    <!-- Char Playlist Tools -->
                    <div id="catta-char-tools" style="display:none;flex-direction:column;gap:5px;">
                        <div style="display:flex;gap:5px;">
                            <input type="text" id="catta-search-char" placeholder="ID หรือชื่อตัวละคร..." style="${S.inp}flex-grow:1;min-width:0;">
                            <button id="catta-btn-search-char" class="catta-btn-small" style="${S.sB}background:#0d47a1;" title="ค้นหา"><i class="fa-solid fa-search"></i> ค้นหา</button>
                        </div>
                        <div id="catta-char-search-results" style="display:none;flex-direction:column;gap:5px;">
                            <select id="catta-char-result-sel" style="${S.sel}width:100%;"></select>
                            <button id="catta-btn-confirm-char" class="catta-btn-small" style="${S.sB}background:#1b5e20;width:100%;"><i class="fa-solid fa-user-plus"></i> เพิ่มตัวละครนี้</button>
                        </div>
                        <button id="catta-btn-del-char" class="catta-btn-small" style="${S.sB}background:#b71c1c;width:100%;" title="ลบตัวละครที่เลือกอยู่"><i class="fa-solid fa-trash"></i> ลบตัวละครปัจจุบัน</button>
                    </div>

                    <!-- Add/Import/Export Links (Universal) -->
                    <div style="display:flex;gap:5px;margin-top:4px;padding-top:6px;border-top:1px solid var(--c-bd, rgba(255,255,255,0.06));">
                        <input type="text" id="catta-input-url" placeholder="วางลิงก์ (.mp3, .ogg)..." style="${S.inp}flex-grow:1;min-width:0;">
                        <button id="catta-btn-save" class="catta-btn-small" style="${S.sB}background:linear-gradient(135deg,${T.main},${T.accent});" title="เพิ่มเพลง"><i class="fa-solid fa-plus"></i></button>
                        <button id="catta-btn-import-txt" class="catta-btn-small" style="${S.sB}background:var(--c-bg-inp, rgba(255,255,255,0.1));color:var(--catta-text-muted, #fff)!important;" title="นำเข้าเพลย์ลิสต์ (.txt)"><i class="fa-solid fa-file-import"></i></button>
                        <button id="catta-btn-export-txt" class="catta-btn-small" style="${S.sB}background:var(--c-bg-inp, rgba(255,255,255,0.1));color:var(--catta-text-muted, #fff)!important;" title="ส่งออกเพลย์ลิสต์ (.txt)"><i class="fa-solid fa-file-export"></i></button>
                        <button id="catta-btn-cloud-sync" class="catta-btn-small" style="${S.sB}background:#0288d1; margin-left:auto;" title="โหลดข้อมูลล่าสุดจากคลาวด์"><i class="fa-solid fa-cloud-arrow-down"></i> ดึงข้อมูล</button>
                    </div>
                </div>
                <div id="catta-list-display" style="${S.lst}"></div>
            </div>
        </div>
        <input type="file" id="catta-cover-upload" accept="image/*" style="display:none;">
        <input type="file" id="catta-txt-upload" accept=".txt" style="display:none;">`;
        $("body").append(html);
        
        // ══ MINIMIZE LOGIC ══
        let isMinimized = false;
        
        function setMinimized(mini) {
            isMinimized = mini;
            const win = $(`#${WIN_ID}`);
            if (mini) {
                win.addClass('minimized');
                // sync mini bar info
                $('#catta-mini-img').attr('src', $('#catta-cover-img').attr('src'));
                let songName = $('#catta-display-name').text();
                if (songName === '✨ Ready to play!') songName = 'Catta Music';
                $('#catta-mini-title').text(songName);
                $('#catta-mini-play').html(isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>');
            } else {
                win.removeClass('minimized');
            }
        }
        
        $('#catta-btn-minimize').on('click', () => setMinimized(true));
        $('#catta-btn-maximize').on('click', () => setMinimized(false));
        
        // Mini bar controls
        $('#catta-mini-play').on('click', () => {
            if(isAuthorized) { togglePlay(); $('#catta-mini-play').html(isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>'); }
        });
        $('#catta-mini-prev').on('click', () => isAuthorized && playPrev());
        $('#catta-mini-next').on('click', () => isAuthorized && playNext());
        
        // Image Upload Logic
        $("#catta-cover-img, #catta-mini-img").on('click', function() {
            if (viewingTab === 'user' || (isMinimized && playingTab === 'user')) {
                $("#catta-cover-upload").click();
            }
        });

        $("#catta-cover-upload").on('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e2) {
                    const base64Img = e2.target.result;
                    const idToUpdate = isMinimized ? playingId : viewingId;
                    if (userPlaylists[idToUpdate]) {
                        userPlaylists[idToUpdate].avatar = base64Img;
                        saveData();
                        updateCoverUI();
                        if (isMinimized) $('#catta-mini-img').attr('src', base64Img);
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Audio Progress Logic
        function formatTime(seconds) {
            if (isNaN(seconds)) return "00:00";
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return m.toString().padStart(2, '0') + ":" + s.toString().padStart(2, '0');
        }

        let isDraggingProgress = false;

        audioPlayer.addEventListener('timeupdate', () => {
            if (isDraggingProgress) return;
            const cur = audioPlayer.currentTime;
            const dur = audioPlayer.duration;
            if (dur) {
                const pct = (cur / dur) * 100;
                const bg = `linear-gradient(90deg, var(--catta-main) ${pct}%, var(--c-bd, rgba(255,255,255,0.2)) ${pct}%)`;
                $("#catta-progress").val(pct).css('background', bg);
                $("#catta-mini-progress").val(pct).css('background', bg);
                $("#catta-song-time").text(formatTime(cur));
                $("#catta-mini-time").text(formatTime(cur));
                $("#catta-song-duration").text(formatTime(dur));
            }
        });

        audioPlayer.addEventListener('loadedmetadata', () => {
            $("#catta-song-duration").text(formatTime(audioPlayer.duration));
        });

        const seekAudio = (e) => {
            const val = e.target.value;
            const dur = audioPlayer.duration;
            if (dur) {
                audioPlayer.currentTime = (val / 100) * dur;
            }
        };

        const updateRangeBg = (e) => {
            const val = e.target.value;
            const bg = `linear-gradient(90deg, var(--catta-main) ${val}%, var(--c-bd, rgba(255,255,255,0.2)) ${val}%)`;
            $(e.target).css('background', bg);
        };

        $("#catta-progress, #catta-mini-progress").on('input', (e) => { isDraggingProgress = true; updateRangeBg(e); });
        $("#catta-progress, #catta-mini-progress").on('change', (e) => { seekAudio(e); isDraggingProgress = false; });
        
        // Buttons
        $('#catta-tab-user').on('click', () => switchTab('user'));
        $('#catta-tab-char').on('click', () => switchTab('char'));
        
        $("#catta-btn-toggle-tools").on('click', function() {
            let isOpen = $(this).data('isOpen') || false;
            isOpen = !isOpen;
            $(this).data('isOpen', isOpen);
            
            if(isOpen) {
                $("#catta-tools-container").slideDown(200);
                $(this).css('color', 'var(--catta-text, #fff)');
                $(this).css('background', 'var(--c-bg-inp, rgba(255,255,255,0.1))');
            } else {
                $("#catta-tools-container").slideUp(200);
                $(this).css('color', 'var(--catta-text-muted, #999)');
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
        $("#catta-close-win").on('click', () => {
            $(`#${WIN_ID}`).fadeOut(200);
            if (settings.showBubble) $(`#${BUBBLE_ID}`).fadeIn(200);
        });

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

        // Add URLs (Supports multiple URLs pasted directly)
        $("#catta-btn-save").on('click', () => {
            if (!isAuthorized) return;
            const inputVal = $("#catta-input-url").val().trim();
            if (!inputVal) return;
            
            const urlRegex = /(https?:\/\/[^\s]+)/gi;
            let matches;
            let addedCount = 0;
            let listObj = viewingTab === 'user' ? userPlaylists : charPlaylists;
            let ytFound = false;
            
            while ((matches = urlRegex.exec(inputVal)) !== null) {
                const url = matches[1];
                if (url.includes('youtube.com') || url.includes('youtu.be')) { ytFound = true; continue; }
                
                if (!listObj[viewingId].tracks.some(t => t.url === url)) {
                    let name = url.split('/').pop() || "Unknown";
                    try { name = decodeURIComponent(name); } catch(e){}
                    name = name.replace(/\.(mp3|wav|ogg|m4a)$/i, '').replace(/[-_]/g, ' ');
                    listObj[viewingId].tracks.push({ name, url });
                    addedCount++;
                }
            }
            
            if (addedCount > 0) {
                $("#catta-input-url").val(""); 
                saveData(); renderPlaylist();
                notifyUser(`✅ เพิ่ม ${addedCount} เพลง`);
            } else if (ytFound) {
                alert("❌ ระบบไม่รองรับลิงก์ YouTube ครับ\nกรุณาใช้ลิงก์ตรงของไฟล์เสียงเท่านั้น");
            } else {
                alert("⚠️ ไม่พบลิงก์ที่รองรับ หรือมีเพลงนี้อยู่แล้ว");
            }
        });

        // 📥 นำเข้า TXT
        $("#catta-btn-import-txt").on('click', () => { if(isAuthorized) $("#catta-txt-upload").click(); });
        $("#catta-txt-upload").on('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e2) {
                const text = e2.target.result;
                const lines = text.split('\n');
                let addedCount = 0;
                let ytFound = false;
                const urlRegex = /(https?:\/\/[^\s]+)/i;
                let listObj = viewingTab === 'user' ? userPlaylists : charPlaylists;
                
                lines.forEach(line => {
                    const match = line.match(urlRegex);
                    if (match) {
                        const url = match[1].trim();
                        if (url.includes('youtube.com') || url.includes('youtu.be')) { ytFound = true; return; }
                        
                        if (!listObj[viewingId].tracks.some(t => t.url === url)) {
                            let name = url.split('/').pop() || "Unknown";
                            try { name = decodeURIComponent(name); } catch(e){}
                            name = name.replace(/\.(mp3|wav|ogg|m4a)$/i, '').replace(/[-_]/g, ' ');
                            listObj[viewingId].tracks.push({ name, url });
                            addedCount++;
                        }
                    }
                });
                
                if (addedCount > 0) {
                    saveData(); renderPlaylist();
                    alert(`✅ นำเข้าสำเร็จ ${addedCount} เพลง`);
                } else if (ytFound) {
                    alert("⚠️ พบลิงก์ YouTube ที่ระบบไม่รองรับ จึงถูกข้ามไป");
                } else {
                    alert("⚠️ ไม่พบลิงก์เพลงที่สามารถเพิ่มได้เลย");
                }
                
                $("#catta-txt-upload").val(""); // reset
            };
            reader.readAsText(file);
        });

        // 📤 ส่งออก TXT
        $("#catta-btn-export-txt").on('click', () => {
            if (!isAuthorized) return;
            let listObj = viewingTab === 'user' ? userPlaylists : charPlaylists;
            const tracks = listObj[viewingId].tracks;
            
            if(tracks.length === 0) return alert("❌ เพลย์ลิสต์ว่างเปล่า ไม่มีอะไรให้ส่งออก");
            
            // Format: ชื่อเพลง ตามด้วยบรรทัดลิงก์ ให้ดูเป็นระเบียบ
            let content = `🐾 Catta Music Playlist: ${listObj[viewingId].name}\n═══════════════════════════════════════════════════\n`;
            content += tracks.map(t => `${t.name}\n- ${t.url}`).join('\n\n');
            
            const blob = new Blob([content], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `CattaMusic_${listObj[viewingId].name.replace(/\s+/g, '_')}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });

        // ☁️ โหลดข้อมูลจาก Cloud (Manual Sync)
        $("#catta-btn-cloud-sync").on('click', async () => {
            if (!isAuthorized) { alert("🔒 โปรดเข้าสู่ระบบ Catta Cafe ก่อนครับ"); return; }
            
            const btn = $("#catta-btn-cloud-sync");
            const oldHtml = btn.html();
            btn.html('<i class="fa-solid fa-spinner fa-spin"></i>'); // เปลี่ยนไอคอนเป็นกำลังโหลด

            const uid = localStorage.getItem('catta_uid') || localStorage.getItem('dante_uid');
            try {
                const res = await fetch(`${settings.apiUrl}/v1/music/load_playlist`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid: uid })
                });
                const data = await res.json();
                
                if (data.success && (data.user_playlists || data.char_playlists)) {
                    if (data.user_playlists) userPlaylists = data.user_playlists;
                    if (data.char_playlists) charPlaylists = data.char_playlists;
                    
                    // บันทึกลงเครื่องทับของเดิม
                    localStorage.setItem(LS_USER_PLAYLISTS, JSON.stringify(userPlaylists));
                    localStorage.setItem(LS_CHAR_PLAYLISTS, JSON.stringify(charPlaylists));
                    
                    updateListSelectors(); updateCoverUI(); renderPlaylist();
                    notifyUser("☁️ โหลดข้อมูลจาก Cloud สำเร็จ!");
                } else {
                    notifyUser("⚠️ ไม่พบข้อมูลที่เคยเซฟไว้บน Cloud");
                }
            } catch(e) {
                console.error("Manual Cloud Sync Error:", e);
                notifyUser("❌ เชื่อมต่อคลาวด์ล้มเหลว");
            }
            btn.html(oldHtml); // คืนค่าปุ่มกลับเป็นเหมือนเดิม
        });

        updateListSelectors();
        switchTab('user');
        applyTheme(settings.theme);
        makeDraggable(document.getElementById(WIN_ID), '.cattamusic-header, #catta-mini-bar');
        

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
        let activeChar = getActiveCharInfo();
        if (charPlaylists["chat"]) {
            charPlaylists["chat"].name = activeChar ? activeChar.name : "Unknown";
            if(activeChar && activeChar.avatar) charPlaylists["chat"].avatar = activeChar.avatar;
        }

        let title = "Catta Music";
        let img = ICON_URL;
        let charTabName = "🐱 ตัวละคร";

        // ถ้าเล่นอยู่ ให้โชว์ปกของอันที่กำลังเล่นเป็นหลัก
        let targetTab = isPlaying ? playingTab : viewingTab;
        let targetId = isPlaying ? playingId : viewingId;

        if (targetTab === 'user') {
            const p = userPlaylists[targetId];
            if (p) {
                title = p.name;
                img = p.avatar || ICON_URL;
            }
            // อัปเดตชื่อแท็บตัวละครตามสิ่งที่เปิดดูอยู่
            const c = charPlaylists[viewingId];
            if (c && viewingId !== 'chat') charTabName = `🐱 ${c.name}`;
        } else {
            const p = charPlaylists[targetId];
            if (p) { 
                title = p.name; 
                img = p.avatar; 
                if (targetId !== 'chat') charTabName = `🐱 ${p.name}`;
            }
        }
        
        $("#catta-cover-title").text(title);
        $("#catta-cover-img").attr("src", img);
        
        // อัปเดตข้อความบนปุ่มแท็บ
        const tabBtn = $("#catta-tab-char");
        const currentText = tabBtn.text();
        const newText = charTabName.length > 15 ? charTabName.substring(0, 15) + '...' : charTabName;
        if (currentText !== newText) {
            tabBtn.text(newText);
        }
    }

    function togglePlayerSmart() {
        const win = $(`#${WIN_ID}`);
        if (win.is(':visible')) {
            win.fadeOut(200);
            if (settings.showBubble) $(`#${BUBBLE_ID}`).fadeIn(200);
        } else {
            win.fadeIn(200); checkAuth();
            $(`#${BUBBLE_ID}`).fadeOut(200);
        }
    }

    function makeDraggable(el, handleSelector, isBubble = false) {
        if (!el) return;
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        const dragStart = (e) => {
            if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button') || e.target.tagName.toLowerCase() === 'input') return;
            const cx = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const cy = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            // Fix transform jumping
            if (!isBubble && el.style.transform.includes('translateX')) {
                const rect = el.getBoundingClientRect();
                el.style.transform = "none";
                el.style.left = rect.left + "px";
                el.style.top = rect.top + "px";
            }
            
            pos3 = cx; pos4 = cy;
            document.onmouseup = document.ontouchend = () => {
                document.onmouseup = document.ontouchend = document.onmousemove = document.ontouchmove = null;
                if (isBubble) { 
                    settings.posBubble = { top: (el.offsetTop/window.innerHeight*100)+"%", left: (el.offsetLeft/window.innerWidth*100)+"%" }; 
                } else {
                    settings.posWindow = { top: el.style.top, left: el.style.left };
                }
                saveData();
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
        
        if (handleSelector) {
            const handles = el.querySelectorAll(handleSelector);
            handles.forEach(h => { h.onmousedown = h.ontouchstart = dragStart; });
        } else {
            el.onmousedown = el.ontouchstart = dragStart;
        }
    }

    function switchTab(tab, forceId = null) {
        viewingTab = tab;
        if (forceId) {
            viewingId = forceId;
        } else {
            viewingId = tab === 'user' ? $("#catta-user-sel").val() : $("#catta-char-sel").val();
        }
        
        const T = themes[settings.theme] || themes.pink;
        // Reset all tab styles
        $('.cattamusic-tabs button').css({ color: T.muted, borderBottom: '2px solid transparent' });
        // Highlight active tab with inline style
        $(`#catta-tab-${tab}`).css({ color: T.main, borderBottom: `2px solid ${T.main}` }).addClass('active');
        $(`#catta-tab-${tab === 'user' ? 'char' : 'user'}`).removeClass('active');
        
        // Hide tools to prevent UI clutter and sync toggle state
        const toolsBtn = $("#catta-btn-toggle-tools");
        if(toolsBtn.length) {
            toolsBtn.css('color', 'var(--catta-text-muted, #999)').css('background', 'none');
            // Trigger a clean close if it was open
            if ($("#catta-tools-container").is(':visible')) {
                 $("#catta-tools-container").hide();
                 toolsBtn.data('isOpen', false);
            }
        }
        
        $("#catta-user-sel").toggle(tab === 'user');
        $("#catta-char-sel").toggle(tab === 'char');
        
        $("#catta-user-tools").toggle(tab === 'user');
        $("#catta-char-tools").toggle(tab === 'char');
        
        updateListSelectors();
        updateCoverUI();
        renderPlaylist();
    }

    function renderPlaylist() {
        const container = $("#catta-list-display");
        if(!container.length) return;
        container.empty();
        
        const T = themes[settings.theme] || themes.pink;
        const list = getViewingArray();
        list.forEach((track, i) => {
            const isActive = (playingTab === viewingTab && playingId === viewingId && currentTrackIndex === i);
            const baseStyle = `display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;font-family:'Itim',cursive;font-size:11px;border-left:2px solid transparent;transition:background .15s;`;
            const activeStyle = `background:linear-gradient(90deg,${T.main}1a,transparent);border-left-color:${T.main};color:${T.text};`;
            const normalStyle = `color:${T.muted};`;
            const numBadge = isActive && isPlaying
                ? `<div class="catta-eq" style="display:inline-flex;align-items:flex-end;gap:2px;height:14px;flex-shrink:0;width:16px;"><span style="width:3px;border-radius:2px;background:${T.main};display:block;height:8px;animation:cattaEQ .55s ease-in-out infinite alternate;"></span><span style="width:3px;border-radius:2px;background:${T.main};display:block;height:12px;animation:cattaEQ .55s ease-in-out infinite alternate .15s;"></span><span style="width:3px;border-radius:2px;background:${T.main};display:block;height:5px;animation:cattaEQ .55s ease-in-out infinite alternate .3s;"></span></div>`
                : `<span class="track-num-badge" style="width:16px;text-align:center;font-size:10px;flex-shrink:0;font-family:'Itim',cursive;color:${T.muted};">${i+1}</span>`;
            const item = $(`<div class="playlist-item ${isActive?'active-track':''}" style="${baseStyle}${isActive?activeStyle:normalStyle}">${numBadge}<span class="track-name-text" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Itim',cursive;color:var(--catta-text);">${track.name}</span>${track.mood?`<span style="font-size:9px;color:var(--catta-text-muted, ${T.muted});margin-right:2px;flex-shrink:0;max-width:55px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${track.mood.split('|')[0]}</span>`:''}<span class="del-btn" style="color:var(--c-bd, rgba(255,255,255,.18));cursor:pointer;font-size:14px;padding:0 3px;flex-shrink:0;line-height:1;">×</span></div>`);
            item.find('.track-name-text').on('click', () => isAuthorized && playTrack(i, viewingTab, viewingId));
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
        $(`#${WIN_ID}`).addClass('playing');
        $("#catta-display-name").text(list[i].name);
        $("#catta-play-dot").css('opacity','1');
        
        // sync mini bar
        $('#catta-mini-title').text(list[i].name);
        $('#catta-mini-play').html('<i class="fa-solid fa-pause"></i>');
        
        // แสดง mood pills
        if (list[i].mood) {
            const T = themes[settings.theme] || themes.pink;
            const pills = list[i].mood.split('|').map(m => `<span style="font-size:9px;padding:2px 8px;border-radius:20px;background:${T.main}18;color:${T.main};border:1px solid ${T.main}44;font-family:'Itim',cursive;">${m.trim()}</span>`).join('');
            $("#catta-mood-row").html(pills);
        } else {
            $("#catta-mood-row").empty();
        }
        
        updateCoverUI();
        renderPlaylist();
        
        document.documentElement.style.setProperty('--catta-main', themes[settings.theme].main);
    }

    function togglePlay() {
        const list = viewingTab === 'char' ? charPlaylists[viewingId].tracks : userPlaylists[viewingId].tracks;
        
        // ถ้ายังไม่ได้เริ่มเล่น หรือไม่มีลิงก์เพลงค้างใน Audio เลย
        if (!audioPlayer.src || audioPlayer.src === window.location.href) {
            // ให้เล่นเพลงแรกใน *หน้าต่างที่กำลังเปิดดูอยู่ (Viewing)*
            if (list && list.length > 0) {
                return playTrack(0, viewingTab, viewingId);
            } else {
                return notifyUser("⚠️ เพลย์ลิสต์นี้ว่างเปล่า");
            }
        }
        
        // ถัามีเพลงเล่นค้างอยู่ ให้สลับเล่น/หยุด
        if (isPlaying) { audioPlayer.pause(); $("#catta-btn-play").html('<i class="fa-solid fa-play"></i>'); $(`#${WIN_ID}`).removeClass('playing'); }
        else { audioPlayer.play(); $("#catta-btn-play").html('<i class="fa-solid fa-pause"></i>'); $(`#${WIN_ID}`).addClass('playing'); }
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
        const T = themes[themeName] || themes.pink;
        const win = $(`#${WIN_ID}`);
        if(!win.length) return;

        const isLight = T.type === 'light';

        win.css({ 
            background: T.dark, 
            borderColor: T.main + '44',
            boxShadow: `0 20px 60px rgba(0,0,0,.${isLight ? '2' : '8'}),0 0 40px ${T.glow},0 0 0 1px ${isLight ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)'} inset`,
            '--c-bg-1': isLight ? 'var(--c-main-dim)' : 'rgba(255,255,255,.06)',
            '--c-bg-2': isLight ? 'var(--c-card)' : 'rgba(0,0,0,.2)',
            '--c-bg-inp': isLight ? 'var(--c-main-dim)' : 'rgba(255,255,255,.08)',
            '--c-bd': isLight ? 'var(--c-main-bd)' : 'rgba(255,255,255,.07)',
            '--c-min-bg': isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(18, 18, 24, 0.9)',
            '--catta-text': T.text,
            '--catta-text-muted': T.muted,
            '--c-card': T.card,
            '--c-main-dim': T.main + '22',
            '--c-main-bd': T.main + '44'
        });

        win.find('#catta-display-name').css('color', T.main);
        win.find('#catta-play-dot').css('background', T.main);
        win.find('#catta-cover-title, #catta-mini-title').css('color', T.text);
        win.find('#catta-track-count, #catta-song-time, #catta-song-duration, #catta-mini-time, #catta-mini-sub').css('color', T.muted);
        win.find('#catta-btn-loop, #catta-btn-prev, #catta-btn-next, #catta-btn-voldown, #catta-btn-volup, #catta-btn-toggle-tools, #catta-mini-prev, #catta-mini-next').css('color', T.muted);
        win.find('#catta-mini-play').css('color', T.main);
        win.find('#catta-btn-play').css({
            background: `linear-gradient(135deg,${T.main},${T.accent})`,
            boxShadow: `0 6px 20px ${T.glow}`
        });
        win.find('#catta-btn-save').css('background', `linear-gradient(135deg,${T.main},${T.accent})`);
        win.find('.catta-header-title').css({
            background: `linear-gradient(90deg,${T.main},${T.accent})`,
            '-webkit-background-clip': 'text', '-webkit-text-fill-color': 'transparent', 'background-clip': 'text'
        });
        win.find('#catta-banner-container').css('background', `linear-gradient(180deg,${T.main}12,transparent)`);
        win.find('.cattamusic-playlist').css('background', T.dark);

        // Active tab indicator
        win.find('.cattamusic-tabs button.active').css('borderBottomColor', T.main).css('color', T.main);

        settings.theme = themeName; saveData();
    }

    function showLockedUI() {
        $(`#${WIN_ID} .cattamusic-controls, #${WIN_ID} .cattamusic-tabs, #${WIN_ID} .cattamusic-playlist`).css({'filter':'blur(4px) grayscale(1)', 'pointer-events':'none'});
        $("#catta-display-name").html("<span style='color:red;'>🔒 LOCK: Please Login Catta Cafe</span>");
        if (isPlaying) { audioPlayer.pause(); isPlaying = false; $("#catta-btn-play").html('<i class="fa-solid fa-play"></i>'); $(`#${WIN_ID}`).removeClass('playing'); updateCoverUI(); }
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

    async function init() {
        loadData();
        buildSettings();
        if (settings.isEnabled) {
            buildBubble();
            buildPlayerWindow();
            const isAuth = checkAuth();
            
            // ระบบ Cloud Sync: ดึงข้อมูลจาก Casa DB เมื่อล็อกอินแล้ว
            if (isAuth) {
                const uid = localStorage.getItem('catta_uid') || localStorage.getItem('dante_uid');
                const token = localStorage.getItem('catta_auth_token') || localStorage.getItem('dante_token');
                try {
                    const res = await fetch(`${settings.apiUrl}/v1/music/load_playlist`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid, token })
                    });
                    const data = await res.json();
                    if (data.success && (data.user_playlists || data.char_playlists)) {
                        if (data.user_playlists) userPlaylists = data.user_playlists;
                        if (data.char_playlists) charPlaylists = data.char_playlists;
                        // บันทึกลง Local กันเหนียวอีกรอบ
                        localStorage.setItem(LS_USER_PLAYLISTS, JSON.stringify(userPlaylists));
                        localStorage.setItem(LS_CHAR_PLAYLISTS, JSON.stringify(charPlaylists));
                        updateListSelectors(); updateCoverUI(); renderPlaylist();
                    }
                } catch(e) { console.warn("Cloud Sync Load Error:", e); }
            }

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
