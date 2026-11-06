/**
 * ============================================================================
 * Lora Mascot Widget — Self-Contained, Mobile-Optimized Vanilla JS Widget
 * ============================================================================
 *
 * STRICT SAFETY RULES:
 * 1. Self-injects its own stylesheet (mascot.css) and DOM elements into <body>.
 * 2. Entirely wrapped in an IIFE. Exposes ONLY window.Mascot.
 * 3. Never throws uncaught errors. Fails silently to static image or hidden state.
 * 4. Zero dependencies. No external network requests.
 * 5. High z-index with pointer-events: none on wrapper, keeping the dashboard clickable.
 */

(function () {
  'use strict';

  // Prevent multiple initializations if the script tag is added more than once
  if (window.Mascot && window.Mascot.__initialized) {
    return;
  }

  // ==========================================================================
  // ⚙️ WIDGET CONFIGURATION & SETTINGS
  // Tune sizes, colors, timing, messages, and keying parameters here.
  // ==========================================================================
  const CONFIG = {
    // Assets directory path relative to current HTML page
    assetsPath: 'assets/mascot/',

    // Chroma-Key Screen Color (default: Solid Magenta #FF00FF; or #808080 for flat gray)
    keyColor: '#FF00FF',
    similarity: 0.28,        // Color similarity threshold (0.01 - 1.0)
    blend: 0.05,             // Edge feathering / smoothstep blend (0.0 - 0.5)
    despill: true,           // Suppress magenta color-bleed along edges

    // Mobile Layout & Safe Positioning
    bottomOffset: 16,        // px above bottom safe area (adjust for bottom navbars)
    mobileBreakpoint: 600,   // px width threshold for mobile assets & sizing
    autoMinimizeOnMobile: false, // Automatically minimize to floating bubble on mobile after greeting

    // Speech Bubble & Messaging
    defaultGreeting: 'Hi, welcome back 👋',
    celebrateMessage: 'Great job! 🎉',
    speechDurationMs: 3400,  // How long the speech bubble stays visible

    // Performance & Battery
    mobileFps: 24,           // Canvas framerate cap on mobile screens
    maxDevicePixelRatio: 2,  // Cap canvas resolution for battery savings
  };

  // ==========================================================================
  // 🛡️ STORAGE & SESSION HELPERS (Prefix: mascot_)
  // ==========================================================================
  function getStorage(key, isSession = false) {
    try {
      const storage = isSession ? window.sessionStorage : window.localStorage;
      return storage ? storage.getItem('mascot_' + key) : null;
    } catch (e) {
      return null;
    }
  }

  function setStorage(key, value, isSession = false) {
    try {
      const storage = isSession ? window.sessionStorage : window.localStorage;
      if (storage) storage.setItem('mascot_' + key, String(value));
    } catch (e) {}
  }

  // ==========================================================================
  // 🔍 ENVIRONMENT & DEVICE CAPABILITY DETECTION
  // ==========================================================================
  function isMobileScreen() {
    return window.innerWidth <= CONFIG.mobileBreakpoint;
  }

  function isDataSaverOrSlow() {
    try {
      if (navigator.connection) {
        if (navigator.connection.saveData === true) return true;
        const type = navigator.connection.effectiveType;
        if (type === '2g' || type === 'slow-2g') return true;
      }
    } catch (e) {}
    return false;
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  // Test if the browser natively supports transparent WebM (VP9 + yuva420p)
  // Apple iOS Safari & macOS Safari do not support VP9 alpha WebM; they use Canvas fallback.
  function supportsTransparentWebM() {
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isIOS || isSafari) return false;

      const video = document.createElement('video');
      const canPlay = video.canPlayType('video/webm; codecs="vp9, opus"');
      return Boolean(canPlay);
    } catch (e) {
      return false;
    }
  }

  // Read learner name from optional body data-name or #mascot-config element
  function getLearnerGreeting() {
    try {
      const bodyName = document.body ? document.body.getAttribute('data-name') : null;
      if (bodyName && bodyName.trim()) {
        return `Hi ${bodyName.trim()}, welcome back 👋`;
      }
      const configEl = document.getElementById('mascot-config');
      if (configEl) {
        const configName = configEl.getAttribute('data-name');
        if (configName && configName.trim()) {
          return `Hi ${configName.trim()}, welcome back 👋`;
        }
      }
    } catch (e) {}
    return CONFIG.defaultGreeting;
  }

  // Parse Hex Key Color to RGB components
  function parseHexColor(hex) {
    let clean = (hex || '#FF00FF').replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  // ==========================================================================
  // 🎨 CHROMA KEY CANVAS PROCESSOR (PART 2: LIVE FALLBACK FOR IOS / SAFARI)
  // Real-time canvas despill & alpha keyed video loop
  // ==========================================================================
  class ChromaKeyCanvas {
    constructor(canvas, video, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { willReadFrequently: true });
      this.video = video;
      this.keyRgb = parseHexColor(options.keyColor || CONFIG.keyColor);
      this.similarity = options.similarity !== undefined ? options.similarity : CONFIG.similarity;
      this.blend = options.blend !== undefined ? options.blend : CONFIG.blend;
      this.despill = options.despill !== undefined ? options.despill : CONFIG.despill;
      this.isRunning = false;
      this.isPaused = false;
      this.lastFrameTime = 0;
      this.fpsInterval = 1000 / (isMobileScreen() ? CONFIG.mobileFps : 60);

      this.renderFrame = this.renderFrame.bind(this);
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.isPaused = false;
      this.scheduleNextFrame();
    }

    pause() {
      this.isPaused = true;
    }

    resume() {
      if (!this.isRunning) {
        this.start();
      } else {
        this.isPaused = false;
        this.scheduleNextFrame();
      }
    }

    stop() {
      this.isRunning = false;
      this.isPaused = true;
    }

    scheduleNextFrame() {
      if (!this.isRunning || this.isPaused) return;

      if ('requestVideoFrameCallback' in this.video) {
        this.video.requestVideoFrameCallback(this.renderFrame);
      } else {
        requestAnimationFrame(this.renderFrame);
      }
    }

    renderFrame(now) {
      if (!this.isRunning || this.isPaused) return;

      // Frame-rate throttle on mobile
      const elapsed = now - this.lastFrameTime;
      if (elapsed >= this.fpsInterval || !this.lastFrameTime) {
        this.lastFrameTime = now - (elapsed % this.fpsInterval);
        this.processCurrentFrame();
      }

      this.scheduleNextFrame();
    }

    processCurrentFrame() {
      const v = this.video;
      if (!v || v.readyState < 2 || v.paused || v.ended) return;

      const vw = v.videoWidth || 360;
      const vh = v.videoHeight || 480;

      // Cap canvas resolution for battery savings
      const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDevicePixelRatio);
      const displayW = Math.max(80, this.canvas.clientWidth || 140);
      const targetW = Math.round(displayW * dpr);
      const targetH = Math.round((vh / vw) * targetW);

      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      }

      const ctx = this.ctx;
      ctx.drawImage(v, 0, 0, targetW, targetH);

      let frame;
      try {
        frame = ctx.getImageData(0, 0, targetW, targetH);
      } catch (e) {
        return; // Cross-origin safety fail
      }

      const data = frame.data;
      const len = data.length;
      const kr = this.keyRgb.r;
      const kg = this.keyRgb.g;
      const kb = this.keyRgb.b;
      const sim = this.similarity;
      const bl = Math.max(0.01, this.blend);
      const doDespill = this.despill;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Normalized color distance from key color
        const diffR = (r - kr) / 255;
        const diffG = (g - kg) / 255;
        const diffB = (b - kb) / 255;
        const dist = Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB);

        // Strict protection for White Tunic (high R, G, B) and Green Skirt (high G)
        const isWhite = r > 200 && g > 200 && b > 200;
        const isGreen = g > 110 && g > r + 24 && g > b + 24;

        if (isWhite || isGreen) {
          // Fully keep tunic and skirt
          continue;
        }

        if (dist <= sim) {
          // Keyed background pixel
          data[i + 3] = 0;
        } else if (dist < sim + bl) {
          // Smoothstep soft boundary edge
          const edge = (dist - sim) / bl;
          data[i + 3] = Math.round(255 * (edge * edge * (3 - 2 * edge)));

          // Edge Despill: Suppress magenta/pink fringe along borders
          if (doDespill && kr > 180 && kb > 180 && kg < 80) {
            const avgG = g;
            if (data[i] > avgG) data[i] = avgG;
            if (data[i + 2] > avgG) data[i + 2] = avgG;
          }
        }
      }

      ctx.putImageData(frame, 0, 0);
    }
  }

  // ==========================================================================
  // 🚀 MAIN MASCOT CONTROLLER CLASS
  // ==========================================================================
  class MascotWidget {
    constructor() {
      this.__initialized = true;
      this.dom = {};
      this.chromaKeyers = {};
      this.currentAction = 'idle';
      this.actionTimeout = null;
      this.speechTimeout = null;
      this.isMin = false;
      this.useTransparentWebM = supportsTransparentWebM();
      this.staticOnly = isDataSaverOrSlow() || prefersReducedMotion();

      this.init();
    }

    init() {
      try {
        this.injectStylesheet();
        this.buildDom();
        this.bindEvents();

        // Reveal widget container with smooth slide-in
        requestAnimationFrame(() => {
          if (this.dom.root) {
            this.dom.root.classList.remove('mascot-initial-hidden');
            this.dom.root.classList.add('mascot-ready');
          }
        });

        // Check if user previously minimized mascot
        const savedMin = getStorage('minimized') === 'true';
        if (savedMin) {
          this.minimize(true);
        }

        // Handle initial session greeting
        this.handleInitialSessionFlow();

        // Lazy load secondary action clips after page idle
        this.scheduleSecondaryPreload();
      } catch (err) {
        // Fail silently as required by safety rule #5
        console.warn('[Mascot] Initialized in fallback mode:', err);
      }
    }

    // ── Self-Injecting Stylesheet ──
    injectStylesheet() {
      if (document.getElementById('mascot-stylesheet')) return;
      const link = document.createElement('link');
      link.id = 'mascot-stylesheet';
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = this.getBaseUrl() + 'mascot.css';
      document.head.appendChild(link);
    }

    // ── Base URL Resolver (works from root or subfolders) ──
    getBaseUrl() {
      try {
        const currentScript = document.currentScript || Array.from(document.querySelectorAll('script')).find(s => s.src && s.src.includes('mascot.js'));
        if (currentScript && currentScript.src) {
          const url = new URL(currentScript.src, window.location.href);
          return url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1);
        }
      } catch (e) {}
      return '';
    }

    assetBase() {
      return this.getBaseUrl() + CONFIG.assetsPath;
    }

    // ── Asset Path Helper ──
    getAssetUrl(name, ext) {
      const isMob = isMobileScreen();
      const base = this.assetBase();
      // On mobile, try -sm asset for WebM if available
      if (ext === 'webm' && isMob) {
        return `${base}${name}-sm.webm`;
      }
      return `${base}${name}.${ext}`;
    }

    // ── DOM Construction ──
    buildDom() {
      const root = document.createElement('div');
      root.id = 'mascot-widget-root';
      root.className = 'mascot-initial-hidden';
      root.style.setProperty('--mascot-bottom-offset', `${CONFIG.bottomOffset}px`);

      // 1. Speech Bubble (aria-live="polite" for screen readers)
      const bubble = document.createElement('div');
      bubble.className = 'mascot-speech-bubble';
      bubble.setAttribute('role', 'status');
      bubble.setAttribute('aria-live', 'polite');
      bubble.textContent = CONFIG.defaultGreeting;
      bubble.addEventListener('click', () => this.hideSpeech());

      // 2. Character Stage
      const stage = document.createElement('div');
      stage.className = 'mascot-stage';
      stage.setAttribute('tabindex', '0');
      stage.setAttribute('role', 'button');
      stage.setAttribute('aria-label', 'Course Guide Mascot. Tap to hear greeting.');

      // 2a. Minimize Button
      const minBtn = document.createElement('button');
      minBtn.className = 'mascot-btn-minimize';
      minBtn.setAttribute('type', 'button');
      minBtn.setAttribute('aria-label', 'Minimize mascot guide');
      minBtn.innerHTML = '<span class="mascot-minimize-icon" aria-hidden="true">✕</span>';
      minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.minimize();
      });
      stage.appendChild(minBtn);

      // 2b. Layers: Idle Layer & Action Layer
      const idleLayer = document.createElement('div');
      idleLayer.className = 'mascot-layer mascot-layer-idle';

      const actionLayer = document.createElement('div');
      actionLayer.className = 'mascot-layer mascot-layer-action';

      if (this.staticOnly) {
        // Data-Saver / Reduced-Motion mode: Static PNGs only
        const staticImg = document.createElement('img');
        staticImg.className = 'mascot-static-layer';
        staticImg.alt = 'Course Mascot';
        staticImg.src = `${this.assetBase()}mascot-static${isMobileScreen() ? '-sm' : ''}.png`;
        idleLayer.appendChild(staticImg);
      } else if (this.useTransparentWebM) {
        // Native Transparent WebM Layer (Chrome / Firefox / Edge / Android)
        const idleVideo = document.createElement('video');
        idleVideo.className = 'mascot-layer';
        idleVideo.muted = true;
        idleVideo.playsInline = true;
        idleVideo.loop = true;
        idleVideo.preload = 'auto';
        idleVideo.src = this.getAssetUrl('idle', 'webm');
        idleLayer.appendChild(idleVideo);
        this.dom.idleVideo = idleVideo;

        const actionVideo = document.createElement('video');
        actionVideo.className = 'mascot-layer';
        actionVideo.muted = true;
        actionVideo.playsInline = true;
        actionVideo.preload = isMobileScreen() ? 'metadata' : 'auto';
        actionLayer.appendChild(actionVideo);
        this.dom.actionVideo = actionVideo;
      } else {
        // Live HTML5 Canvas Chroma-Keyer Fallback (iOS Safari)
        const idleVideo = document.createElement('video');
        idleVideo.className = 'mascot-video-feed-hidden';
        idleVideo.muted = true;
        idleVideo.playsInline = true;
        idleVideo.loop = true;
        idleVideo.preload = 'auto';
        idleVideo.src = `${this.assetBase()}idle.mp4`;

        const idleCanvas = document.createElement('canvas');
        idleCanvas.className = 'mascot-canvas-layer';
        idleLayer.appendChild(idleCanvas);
        root.appendChild(idleVideo);

        this.dom.idleVideo = idleVideo;
        this.dom.idleCanvas = idleCanvas;
        this.chromaKeyers.idle = new ChromaKeyCanvas(idleCanvas, idleVideo);

        const actionVideo = document.createElement('video');
        actionVideo.className = 'mascot-video-feed-hidden';
        actionVideo.muted = true;
        actionVideo.playsInline = true;
        actionVideo.preload = 'metadata';

        const actionCanvas = document.createElement('canvas');
        actionCanvas.className = 'mascot-canvas-layer';
        actionLayer.appendChild(actionCanvas);
        root.appendChild(actionVideo);

        this.dom.actionVideo = actionVideo;
        this.dom.actionCanvas = actionCanvas;
        this.chromaKeyers.action = new ChromaKeyCanvas(actionCanvas, actionVideo);
      }

      stage.appendChild(idleLayer);
      stage.appendChild(actionLayer);

      // Tap stage to replay greeting
      stage.addEventListener('click', () => {
        this.play('greeting');
        this.say(getLearnerGreeting());
      });

      // Keyboard support: Enter / Space triggers greeting
      stage.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.play('greeting');
          this.say(getLearnerGreeting());
        }
      });

      // 3. Minimized Floating Avatar Bubble
      const minBubble = document.createElement('div');
      minBubble.className = 'mascot-minimized-bubble';
      minBubble.setAttribute('tabindex', '0');
      minBubble.setAttribute('role', 'button');
      minBubble.setAttribute('aria-label', 'Open Course Guide Mascot');
      minBubble.innerHTML = `<img src="${this.assetBase()}mascot-static-sm.png" alt="Mascot Avatar" onerror="this.src='${this.assetBase()}mascot-original.png'" />`;
      minBubble.addEventListener('click', () => this.restore());
      minBubble.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.restore();
        }
      });

      // Assemble Root
      root.appendChild(bubble);
      root.appendChild(stage);
      root.appendChild(minBubble);

      document.body.appendChild(root);

      this.dom.root = root;
      this.dom.bubble = bubble;
      this.dom.stage = stage;
      this.dom.idleLayer = idleLayer;
      this.dom.actionLayer = actionLayer;
      this.dom.minBubble = minBubble;
    }

    // ── Bind Mobile & System Events ──
    bindEvents() {
      // 1. Listen for custom window event: 'lesson-complete'
      window.addEventListener('lesson-complete', () => {
        this.play('celebrate');
        this.say(CONFIG.celebrateMessage);
      });

      // 2. Hide mascot when on-screen keyboard opens or input/textarea is focused
      const handleInputFocus = () => {
        if (isMobileScreen() && this.dom.root) {
          this.dom.root.classList.add('mascot-keyboard-hidden');
        }
      };
      const handleInputBlur = () => {
        if (this.dom.root) {
          this.dom.root.classList.remove('mascot-keyboard-hidden');
        }
      };

      document.addEventListener('focusin', (e) => {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
          handleInputFocus();
        }
      });

      document.addEventListener('focusout', (e) => {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) {
          handleInputBlur();
        }
      });

      // VisualViewport resize detection (detects soft keyboard on iOS / Android)
      if (window.visualViewport) {
        let initialH = window.visualViewport.height;
        window.visualViewport.addEventListener('resize', () => {
          if (!window.visualViewport) return;
          const currentH = window.visualViewport.height;
          // If viewport shrunk by > 150px, keyboard is open
          if (initialH - currentH > 150) {
            handleInputFocus();
          } else if (Math.abs(currentH - initialH) < 50) {
            handleInputBlur();
          }
        });
      }

      // 3. Tab visibility change: Pause background video & canvas rendering to save battery
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseAllMedia();
        } else if (!this.isMin) {
          this.resumeCurrentMedia();
        }
      });

      // 4. Orientation change & Resize handling (debounced)
      let resizeTimer = null;
      const onResizeOrOrientation = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this.handleScreenResize();
        }, 250);
      };

      window.addEventListener('resize', onResizeOrOrientation);
      window.addEventListener('orientationchange', onResizeOrOrientation);

      // 5. One-time tap listener to resume autoplay if blocked by strict browser policy
      const unlockAudioVideo = () => {
        if (this.dom.idleVideo && this.dom.idleVideo.paused && !this.staticOnly) {
          this.dom.idleVideo.play().catch(() => {});
        }
        window.removeEventListener('touchstart', unlockAudioVideo);
        window.removeEventListener('click', unlockAudioVideo);
      };
      window.addEventListener('touchstart', unlockAudioVideo, { passive: true });
      window.addEventListener('click', unlockAudioVideo, { passive: true });
    }

    // ── Initial Session Greeting Flow ──
    handleInitialSessionFlow() {
      const greeted = getStorage('session_greeted', true) === 'true';

      if (!greeted) {
        // First load of session: Play greeting once, then transition to idle
        setStorage('session_greeted', 'true', true);
        this.play('greeting');
        this.say(getLearnerGreeting());

        // Mobile default state: autoMinimizeOnMobile setting
        if (isMobileScreen() && CONFIG.autoMinimizeOnMobile) {
          setTimeout(() => {
            this.minimize();
          }, CONFIG.speechDurationMs + 800);
        }
      } else {
        // Returning load in same session: go straight to idle
        this.play('idle');
      }
    }

    // ── Lazy Preload Secondary Video Clips ──
    scheduleSecondaryPreload() {
      if (this.staticOnly) return;

      const preloadSecondary = () => {
        try {
          const clips = ['greeting', 'celebrate'];
          clips.forEach((name) => {
            const v = document.createElement('video');
            v.preload = isMobileScreen() ? 'metadata' : 'auto';
            v.src = this.useTransparentWebM
              ? this.getAssetUrl(name, 'webm')
              : `${this.assetBase()}${name}.mp4`;
          });
        } catch (e) {}
      };

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(preloadSecondary);
      } else {
        setTimeout(preloadSecondary, 1200);
      }
    }

    // ── Media Playback Handlers ──
    play(actionName) {
      if (this.staticOnly) return;

      if (actionName === 'idle') {
        this.showIdleLayer();
        return;
      }

      // Action clip: greeting or celebrate
      this.currentAction = actionName;
      clearTimeout(this.actionTimeout);

      if (this.useTransparentWebM) {
        const v = this.dom.actionVideo;
        if (!v) return;

        v.src = this.getAssetUrl(actionName, 'webm');
        v.currentTime = 0;

        v.play()
          .then(() => {
            this.dom.actionLayer.classList.add('mascot-active');
            v.onended = () => {
              this.showIdleLayer();
            };
          })
          .catch((err) => {
            // Autoplay rejection / low power mode fallback
            this.showFallbackStatic();
          });
      } else {
        // Canvas Chroma Keyer Playback
        const v = this.dom.actionVideo;
        const keyer = this.chromaKeyers.action;
        if (!v || !keyer) return;

        v.src = `${this.assetBase()}${actionName}.mp4`;
        v.currentTime = 0;

        v.play()
          .then(() => {
            keyer.start();
            this.dom.actionLayer.classList.add('mascot-active');
            v.onended = () => {
              keyer.stop();
              this.showIdleLayer();
            };
          })
          .catch(() => {
            this.showFallbackStatic();
          });
      }
    }

    showIdleLayer() {
      this.currentAction = 'idle';
      if (this.dom.actionLayer) {
        this.dom.actionLayer.classList.remove('mascot-active');
      }

      if (this.useTransparentWebM) {
        const iv = this.dom.idleVideo;
        if (iv && iv.paused) {
          iv.play().catch(() => this.showFallbackStatic());
        }
      } else if (this.chromaKeyers.idle) {
        const iv = this.dom.idleVideo;
        if (iv) {
          iv.play()
            .then(() => this.chromaKeyers.idle.start())
            .catch(() => this.showFallbackStatic());
        }
      }
    }

    showFallbackStatic() {
      if (this.dom.idleLayer && !this.dom.idleLayer.querySelector('.mascot-static-layer')) {
        const img = document.createElement('img');
        img.className = 'mascot-static-layer';
        img.alt = 'Course Mascot';
        img.src = `${this.assetBase()}mascot-static${isMobileScreen() ? '-sm' : ''}.png`;
        img.onerror = () => {
          img.src = `${this.assetBase()}mascot-original.png`;
        };
        this.dom.idleLayer.innerHTML = '';
        this.dom.idleLayer.appendChild(img);
      }
    }

    pauseAllMedia() {
      try {
        if (this.dom.idleVideo) this.dom.idleVideo.pause();
        if (this.dom.actionVideo) this.dom.actionVideo.pause();
        if (this.chromaKeyers.idle) this.chromaKeyers.idle.pause();
        if (this.chromaKeyers.action) this.chromaKeyers.action.pause();
      } catch (e) {}
    }

    resumeCurrentMedia() {
      if (this.staticOnly) return;
      if (this.currentAction === 'idle') {
        this.showIdleLayer();
      } else {
        this.play(this.currentAction);
      }
    }

    // ── Speech Bubble Controller ──
    say(text, durationMs) {
      if (!this.dom.bubble) return;
      clearTimeout(this.speechTimeout);

      this.dom.bubble.textContent = text || CONFIG.defaultGreeting;
      this.dom.bubble.classList.add('mascot-visible');

      const time = durationMs || CONFIG.speechDurationMs;
      this.speechTimeout = setTimeout(() => {
        this.hideSpeech();
      }, time);
    }

    hideSpeech() {
      clearTimeout(this.speechTimeout);
      if (this.dom.bubble) {
        this.dom.bubble.classList.remove('mascot-visible');
      }
    }

    // ── Minimize & Restore ──
    minimize(silent = false) {
      this.isMin = true;
      setStorage('minimized', 'true');
      this.hideSpeech();
      this.pauseAllMedia();

      if (this.dom.root) {
        this.dom.root.classList.add('mascot-is-minimized');
      }
    }

    restore() {
      this.isMin = false;
      setStorage('minimized', 'false');

      if (this.dom.root) {
        this.dom.root.classList.remove('mascot-is-minimized');
      }

      this.resumeCurrentMedia();
      this.say(getLearnerGreeting());
    }

    // ── Orientation & Screen Resize Re-Calculation ──
    handleScreenResize() {
      // Re-evaluate if video source needs update without restarting page
      if (this.useTransparentWebM && this.dom.idleVideo) {
        const expectedSrc = this.getAssetUrl('idle', 'webm');
        if (!this.dom.idleVideo.src.endsWith(expectedSrc)) {
          const curTime = this.dom.idleVideo.currentTime || 0;
          this.dom.idleVideo.src = expectedSrc;
          this.dom.idleVideo.currentTime = curTime;
          this.dom.idleVideo.play().catch(() => {});
        }
      }
    }
  }

  // ==========================================================================
  // 🌐 PUBLIC API (window.Mascot)
  // ==========================================================================
  let instance = null;

  function getInstance() {
    if (!instance) {
      instance = new MascotWidget();
    }
    return instance;
  }

  window.Mascot = {
    __initialized: true,
    play: (action) => getInstance().play(action),
    say: (text, ms) => getInstance().say(text, ms),
    minimize: () => getInstance().minimize(),
    restore: () => getInstance().restore(),
    isMinimized: () => Boolean(instance && instance.isMin),
    getConfig: () => ({ ...CONFIG }),
  };

  // Auto-instantiate when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => getInstance());
  } else {
    getInstance();
  }
})();
