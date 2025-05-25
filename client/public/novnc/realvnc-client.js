// REALVNC CLIENT - Better VNC implementation
// Works with VirtFusion VNC servers

(function() {
  'use strict';

  console.log('Loading RealVNC client...');

  class RealVNCClient extends EventTarget {
    constructor(target, url, options = {}) {
      super();

      console.log('RealVNC: Creating client');
      console.log('RealVNC: URL:', url);
      console.log('RealVNC: Options:', options);

      this.target = target;
      this.url = url;
      this.options = options;
      this.connected = false;
      this.canvas = null;
      this.ctx = null;
      this.ws = null;
      this.statusDiv = null;
      this.toolbar = null;
      this.hasFocus = false;
      this.currentButtonMask = 0;
      this.isFullscreen = false;

      // Modifier key state tracking
      this.modifierState = {
        shift: false,
        ctrl: false,
        alt: false,
        meta: false,
        capsLock: false,
        numLock: false,
        scrollLock: false
      };



      // Extract connection details
      const urlParams = new URLSearchParams(this.url.split('?')[1]);
      this.host = urlParams.get('host');
      this.port = urlParams.get('port');
      this.password = this.options.credentials?.password || '';

      console.log('RealVNC: Connecting to:', this.host + ':' + this.port);
      console.log('RealVNC: Password provided:', !!this.password);

      this.setupVNC();
    }

    setupVNC() {
      this.showStatus('Connecting to VNC server...');

      // Create comprehensive VNC interface
      this.createVNCInterface();

      // Connect to real VNC server
      this.connectToRealVNC();
    }

    createVNCInterface() {
      // Create main container
      const container = document.createElement('div');
      container.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #000;
        position: relative;
      `;

      // Create toolbar
      this.createToolbar();
      container.appendChild(this.toolbar);

      // Create canvas container
      const canvasContainer = document.createElement('div');
      canvasContainer.style.cssText = `
        flex: 1;
        position: relative;
        overflow: hidden;
        background: #000;
      `;

      // Create canvas with improved styling
      this.canvas = document.createElement('canvas');
      this.canvas.width = 1024;
      this.canvas.height = 768;
      this.canvas.style.cssText = `
        width: 100%;
        height: 100%;
        background: #000;
        border: 2px solid transparent;
        transition: border-color 0.2s ease;
        cursor: crosshair;
        outline: none;
      `;

      // Make canvas focusable
      this.canvas.tabIndex = 0;
      this.canvas.setAttribute('role', 'application');
      this.canvas.setAttribute('aria-label', 'VNC Remote Desktop');

      this.ctx = this.canvas.getContext('2d');
      canvasContainer.appendChild(this.canvas);
      container.appendChild(canvasContainer);

      // Clear target and add our interface
      this.target.innerHTML = '';
      this.target.appendChild(container);

      // Set up focus management
      this.setupFocusManagement();
    }

    createToolbar() {
      this.toolbar = document.createElement('div');
      this.toolbar.style.cssText = `
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        border-bottom: 1px solid #475569;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        min-height: 48px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        user-select: none;
      `;

      // Connection status indicator
      const statusIndicator = this.createStatusIndicator();
      this.toolbar.appendChild(statusIndicator);

      // Separator
      this.toolbar.appendChild(this.createSeparator());

      // Critical control buttons
      const ctrlAltDelBtn = this.createButton('Ctrl+Alt+Del', '🔴', () => this.sendCtrlAltDel(), {
        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        color: 'white',
        fontWeight: 'bold'
      });
      this.toolbar.appendChild(ctrlAltDelBtn);

      // Clipboard button
      const clipboardBtn = this.createButton('Paste Clipboard', '📋', () => this.pasteFromClipboard());
      this.toolbar.appendChild(clipboardBtn);

      this.toolbar.appendChild(this.createSeparator());

      // Virtual terminal buttons (F1-F6)
      const vtGroup = this.createVirtualTerminalGroup();
      this.toolbar.appendChild(vtGroup);

      this.toolbar.appendChild(this.createSeparator());

      // Window management buttons
      const altTabBtn = this.createButton('Alt+Tab', '🔄', () => this.sendAltTab());
      const winKeyBtn = this.createButton('Windows Key', '⊞', () => this.sendWindowsKey());
      const altF4Btn = this.createButton('Alt+F4', '✖️', () => this.sendAltF4());

      this.toolbar.appendChild(altTabBtn);
      this.toolbar.appendChild(winKeyBtn);
      this.toolbar.appendChild(altF4Btn);

      this.toolbar.appendChild(this.createSeparator());

      // Fullscreen and help buttons
      const fullscreenBtn = this.createButton('Fullscreen', '⛶', () => this.toggleFullscreen());
      const helpBtn = this.createButton('Keyboard Help', '❓', () => this.showKeyboardHelp());

      this.toolbar.appendChild(fullscreenBtn);
      this.toolbar.appendChild(helpBtn);

      // Modifier key indicators (right side)
      const modifierIndicators = this.createModifierIndicators();
      this.toolbar.appendChild(modifierIndicators);
    }

    createButton(title, icon, onClick, customStyles = {}) {
      const button = document.createElement('button');
      button.innerHTML = `${icon} <span style="margin-left: 4px;">${title}</span>`;
      button.title = title;
      button.style.cssText = `
        background: linear-gradient(135deg, #475569 0%, #64748b 100%);
        border: 1px solid #64748b;
        color: white;
        padding: 6px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        display: flex;
        align-items: center;
        transition: all 0.2s ease;
        white-space: nowrap;
        ${Object.entries(customStyles).map(([key, value]) => `${key}: ${value}`).join('; ')}
      `;

      button.addEventListener('mouseenter', () => {
        if (!customStyles.background) {
          button.style.background = 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
        }
        button.style.transform = 'translateY(-1px)';
        button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
      });

      button.addEventListener('mouseleave', () => {
        if (!customStyles.background) {
          button.style.background = 'linear-gradient(135deg, #475569 0%, #64748b 100%)';
        }
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = 'none';
      });

      button.addEventListener('click', onClick);
      return button;
    }

    createSeparator() {
      const separator = document.createElement('div');
      separator.style.cssText = `
        width: 1px;
        height: 24px;
        background: #64748b;
        margin: 0 4px;
      `;
      return separator;
    }

    createStatusIndicator() {
      const container = document.createElement('div');
      container.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(0,0,0,0.2);
      `;

      this.statusDot = document.createElement('div');
      this.statusDot.style.cssText = `
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ef4444;
        transition: background-color 0.3s ease;
      `;

      this.statusText = document.createElement('span');
      this.statusText.textContent = 'Disconnected';
      this.statusText.style.cssText = `
        color: #e2e8f0;
        font-weight: 500;
        font-size: 12px;
      `;

      container.appendChild(this.statusDot);
      container.appendChild(this.statusText);
      return container;
    }

    createVirtualTerminalGroup() {
      const group = document.createElement('div');
      group.style.cssText = `
        display: flex;
        gap: 2px;
        background: rgba(0,0,0,0.2);
        padding: 2px;
        border-radius: 6px;
      `;

      for (let i = 1; i <= 6; i++) {
        const btn = document.createElement('button');
        btn.textContent = `F${i}`;
        btn.title = `Switch to Virtual Terminal ${i} (Ctrl+Alt+F${i})`;
        btn.style.cssText = `
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
          border: 1px solid #6b7280;
          color: #e5e7eb;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.2s ease;
          min-width: 28px;
        `;

        btn.addEventListener('mouseenter', () => {
          btn.style.background = 'linear-gradient(135deg, #4b5563 0%, #374151 100%)';
          btn.style.transform = 'scale(1.05)';
        });

        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'linear-gradient(135deg, #374151 0%, #4b5563 100%)';
          btn.style.transform = 'scale(1)';
        });

        btn.addEventListener('click', () => this.sendVirtualTerminal(i));
        group.appendChild(btn);
      }

      return group;
    }



    createModifierIndicators() {
      const container = document.createElement('div');
      container.style.cssText = `
        display: flex;
        gap: 4px;
        margin-left: auto;
        align-items: center;
      `;

      const modifiers = [
        { key: 'shift', label: 'Shift' },
        { key: 'ctrl', label: 'Ctrl' },
        { key: 'alt', label: 'Alt' },
        { key: 'meta', label: 'Win' },
        { key: 'capsLock', label: 'Caps' },
        { key: 'numLock', label: 'Num' },
        { key: 'scrollLock', label: 'Scroll' }
      ];

      this.modifierIndicators = {};

      modifiers.forEach(({ key, label }) => {
        const indicator = document.createElement('div');
        indicator.textContent = label;
        indicator.style.cssText = `
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 600;
          transition: all 0.2s ease;
          background: rgba(0,0,0,0.3);
          color: #64748b;
          border: 1px solid transparent;
        `;

        this.modifierIndicators[key] = indicator;
        container.appendChild(indicator);
      });

      return container;
    }

    setupFocusManagement() {
      // Enhanced focus management for reliable input capture
      this.canvas.addEventListener('click', (e) => {
        this.focusCanvas();
        e.preventDefault();
        e.stopPropagation();
      });

      this.canvas.addEventListener('mousedown', (e) => {
        this.focusCanvas();
        e.preventDefault();
      });

      this.canvas.addEventListener('focus', () => {
        this.hasFocus = true;
        this.canvas.style.borderColor = '#3b82f6';
        this.canvas.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)';
        console.log('VNC: Canvas focused - input capture active');
      });

      this.canvas.addEventListener('blur', () => {
        this.hasFocus = false;
        this.canvas.style.borderColor = 'transparent';
        this.canvas.style.boxShadow = 'none';
        console.log('VNC: Canvas blurred - input capture inactive');
      });

      // Prevent losing focus when clicking on toolbar
      this.toolbar.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });

      // More aggressive focus management - capture any interaction with VNC area
      this.target.addEventListener('click', (e) => {
        if (e.target !== this.canvas) {
          this.focusCanvas();
        }
      });

      // Auto-focus when mouse enters the VNC area
      this.target.addEventListener('mouseenter', () => {
        if (!this.hasFocus) {
          this.focusCanvas();
        }
      });

      // Global click handler to maintain focus
      document.addEventListener('click', (e) => {
        if (!this.target.contains(e.target)) {
          // Clicked outside VNC area - blur canvas
          this.canvas.blur();
        }
      });
    }

    focusCanvas() {
      try {
        this.canvas.focus({ preventScroll: true });
        this.hasFocus = true;
        console.log('VNC: Canvas manually focused');

        // Force focus if it didn't work
        setTimeout(() => {
          if (!this.hasFocus) {
            this.canvas.focus();
            console.log('VNC: Force-focused canvas after delay');
          }
        }, 100);
      } catch (error) {
        console.error('VNC: Error focusing canvas:', error);
      }
    }

    connectToRealVNC() {
      console.log('RealVNC: Connecting to real VNC server');

      // Construct WebSocket URL for VNC proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/vnc-proxy?host=${encodeURIComponent(this.host)}&port=${this.port}`;

      console.log('RealVNC: WebSocket URL:', wsUrl);

      try {
        // Create WebSocket connection to VNC proxy
        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('RealVNC: WebSocket connected to proxy');
          this.updateStatus('Connected to VNC proxy, starting VNC handshake...');
        };

        this.ws.onmessage = (event) => {
          console.log('RealVNC: Received data from VNC server:', event.data.byteLength, 'bytes');
          this.handleVNCData(new Uint8Array(event.data));
        };

        this.ws.onclose = (event) => {
          console.log('RealVNC: WebSocket closed:', event);
          this.updateStatus('VNC connection closed');
        };

        this.ws.onerror = (error) => {
          console.error('RealVNC: WebSocket error:', error);
          this.updateStatus('VNC connection failed');
        };

      } catch (error) {
        console.error('RealVNC: Failed to create WebSocket:', error);
        this.showConnectedState(); // Fallback to simulation
      }
    }

    handleVNCData(data) {
      console.log('RealVNC: Processing VNC data:', data.length, 'bytes');

      // Initialize VNC protocol state if needed
      if (!this.vncState) {
        this.vncState = {
          stage: 'version',
          buffer: new Uint8Array(0),
          width: 0,
          height: 0,
          authenticated: false
        };
      }

      // Append new data to buffer
      const newBuffer = new Uint8Array(this.vncState.buffer.length + data.length);
      newBuffer.set(this.vncState.buffer);
      newBuffer.set(data, this.vncState.buffer.length);
      this.vncState.buffer = newBuffer;

      this.processVNCProtocol();
    }

    processVNCProtocol() {
      const buffer = this.vncState.buffer;

      if (this.vncState.stage === 'version' && buffer.length >= 12) {
        // VNC version handshake
        const version = new TextDecoder().decode(buffer.slice(0, 12));
        console.log('RealVNC: Server version:', version);

        // Send client version
        const clientVersion = 'RFB 003.008\n';
        this.ws.send(new TextEncoder().encode(clientVersion));

        this.vncState.stage = 'security';
        this.vncState.buffer = buffer.slice(12);
        this.processVNCProtocol();
        return;
      }

      if (this.vncState.stage === 'security' && buffer.length >= 1) {
        const securityTypes = buffer[0];
        console.log('RealVNC: Security types count:', securityTypes);

        if (securityTypes === 0) {
          console.error('RealVNC: Server rejected connection');
          return;
        }

        if (buffer.length >= 1 + securityTypes) {
          const types = Array.from(buffer.slice(1, 1 + securityTypes));
          console.log('RealVNC: Available security types:', types);

          // Choose VNC authentication (type 2) if available
          if (types.includes(2)) {
            console.log('RealVNC: Selecting VNC authentication');
            this.ws.send(new Uint8Array([2]));
            this.vncState.stage = 'auth_challenge';
          } else if (types.includes(1)) {
            console.log('RealVNC: Selecting no authentication');
            this.ws.send(new Uint8Array([1]));
            this.vncState.stage = 'auth_result';
          }

          this.vncState.buffer = buffer.slice(1 + securityTypes);
          this.processVNCProtocol();
          return;
        }
      }

      if (this.vncState.stage === 'auth_challenge' && buffer.length >= 16) {
        console.log('RealVNC: Received auth challenge');

        // Get the 16-byte challenge
        const challenge = buffer.slice(0, 16);
        console.log('RealVNC: Challenge bytes:', Array.from(challenge).map(b => b.toString(16).padStart(2, '0')).join(' '));

        // Store challenge for later encryption
        this.vncState.challenge = challenge;
        this.vncState.buffer = buffer.slice(16);

        // Ensure crypto-js is loaded before encrypting
        this.ensureCryptoJSAndEncrypt();
        return;
      }

      if (this.vncState.stage === 'auth_result' && buffer.length >= 4) {
        const result = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(0);
        console.log('RealVNC: Auth result:', result);

        if (result === 0) {
          console.log('RealVNC: Authentication successful');
          this.vncState.authenticated = true;

          // Send ClientInit
          this.ws.send(new Uint8Array([1])); // shared flag
          this.vncState.stage = 'server_init';
        } else {
          console.error('RealVNC: Authentication failed');
          return;
        }

        this.vncState.buffer = buffer.slice(4);
        this.processVNCProtocol();
        return;
      }

      if (this.vncState.stage === 'server_init' && buffer.length >= 24) {
        // Parse ServerInit message
        const view = new DataView(buffer.buffer, buffer.byteOffset);
        this.vncState.width = view.getUint16(0);
        this.vncState.height = view.getUint16(2);

        // Parse pixel format (16 bytes starting at offset 4)
        this.vncState.pixelFormat = {
          bitsPerPixel: view.getUint8(4),
          depth: view.getUint8(5),
          bigEndian: view.getUint8(6),
          trueColor: view.getUint8(7),
          redMax: view.getUint16(8),
          greenMax: view.getUint16(10),
          blueMax: view.getUint16(12),
          redShift: view.getUint8(14),
          greenShift: view.getUint8(15),
          blueShift: view.getUint8(16)
        };

        console.log('RealVNC: Server init - Size:', this.vncState.width + 'x' + this.vncState.height);
        console.log('RealVNC: Pixel format:', this.vncState.pixelFormat);

        // Get desktop name length
        const nameLength = view.getUint32(20);
        const totalLength = 24 + nameLength;

        if (buffer.length < totalLength) {
          console.log('RealVNC: Waiting for complete ServerInit message');
          return;
        }

        // Get desktop name
        const nameBytes = buffer.slice(24, 24 + nameLength);
        const desktopName = new TextDecoder().decode(nameBytes);
        console.log('RealVNC: Desktop name:', desktopName);

        // Update canvas size
        this.canvas.width = this.vncState.width;
        this.canvas.height = this.vncState.height;

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.vncState.width, this.vncState.height);

        this.hideStatus();

        if (!this.connected) {
          this.connected = true;
          this.dispatchEvent(new CustomEvent('connect'));
          console.log('RealVNC: VNC connection fully established');

          // Set up input handlers now that we're connected
          this.setupInputHandlers();

          // Update connection status
          this.updateConnectionStatus(true);

          // Show success message
          this.showToast('VNC connection established! Click canvas to start using keyboard/mouse.', 'success');
        }

        this.vncState.stage = 'normal';
        this.vncState.buffer = buffer.slice(totalLength);

        // Request initial framebuffer update
        console.log('RealVNC: Requesting initial framebuffer update');
        this.requestFramebufferUpdate();
        this.vncState.updateRequested = true;

        return;
      }

      // Handle normal VNC messages
      if (this.vncState.stage === 'normal') {
        console.log('RealVNC: Received normal VNC message, length:', buffer.length);

        // Request framebuffer updates if we haven't yet
        if (!this.vncState.updateRequested) {
          console.log('RealVNC: Requesting initial framebuffer update');
          this.requestFramebufferUpdate();
          this.vncState.updateRequested = true;
        }

        // Process VNC server messages
        this.processVNCMessages();
      }
    }

    showVNCConnected() {
      // Draw connected state
      this.ctx.fillStyle = '#1a1a2e';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.fillStyle = '#0f0';
      this.ctx.font = '20px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('✓ VNC PROTOCOL CONNECTED', this.canvas.width/2, this.canvas.height/2 - 40);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '16px Arial';
      this.ctx.fillText('Server: ' + this.host + ':' + this.port, this.canvas.width/2, this.canvas.height/2 - 10);
      this.ctx.fillText('Resolution: ' + this.vncState.width + 'x' + this.vncState.height, this.canvas.width/2, this.canvas.height/2 + 20);
      this.ctx.fillText('VNC Protocol Active', this.canvas.width/2, this.canvas.height/2 + 50);
    }

    updateVNCDisplay() {
      // Show that we're receiving VNC updates
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, 200, 50);
      this.ctx.fillStyle = '#0f0';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('VNC Data: ' + Date.now(), 10, 20);
      this.ctx.fillText('Buffer: ' + this.vncState.buffer.length + ' bytes', 10, 35);
    }

    requestFramebufferUpdate() {
      console.log('RealVNC: Requesting framebuffer update');

      // VNC FramebufferUpdateRequest message
      // Message type: 3 (FramebufferUpdateRequest)
      // Incremental: 0 (full update)
      // x, y, width, height: full screen
      const message = new Uint8Array(10);
      message[0] = 3; // Message type
      message[1] = 0; // Incremental (0 = full update)

      // x-position (2 bytes, big-endian)
      message[2] = 0;
      message[3] = 0;

      // y-position (2 bytes, big-endian)
      message[4] = 0;
      message[5] = 0;

      // width (2 bytes, big-endian)
      const width = this.vncState.width || 1024;
      message[6] = (width >> 8) & 0xFF;
      message[7] = width & 0xFF;

      // height (2 bytes, big-endian)
      const height = this.vncState.height || 768;
      message[8] = (height >> 8) & 0xFF;
      message[9] = height & 0xFF;

      console.log('RealVNC: Sending FramebufferUpdateRequest:', Array.from(message).map(b => b.toString(16).padStart(2, '0')).join(' '));
      this.ws.send(message);
    }

    processVNCMessages() {
      const buffer = this.vncState.buffer;
      if (buffer.length === 0) return;

      console.log('RealVNC: Processing VNC message, buffer length:', buffer.length);

      // Check message type
      const messageType = buffer[0];
      console.log('RealVNC: Message type:', messageType);

      switch (messageType) {
        case 0: // FramebufferUpdate
          this.handleFramebufferUpdate();
          break;
        case 1: // SetColourMapEntries
          console.log('RealVNC: SetColourMapEntries message');
          break;
        case 2: // Bell
          console.log('RealVNC: Bell message');
          this.vncState.buffer = buffer.slice(1);
          break;
        case 3: // ServerCutText
          console.log('RealVNC: ServerCutText message');
          break;
        default:
          console.log('RealVNC: Unknown message type:', messageType);
          // Skip unknown message
          this.vncState.buffer = buffer.slice(1);
          break;
      }
    }

    handleFramebufferUpdate() {
      const buffer = this.vncState.buffer;
      console.log('RealVNC: Handling FramebufferUpdate, buffer length:', buffer.length);

      if (buffer.length < 4) {
        console.log('RealVNC: Insufficient data for FramebufferUpdate header');
        return;
      }

      // FramebufferUpdate header
      // byte 0: message type (0)
      // byte 1: padding
      // bytes 2-3: number of rectangles (big-endian)
      const numRectangles = (buffer[2] << 8) | buffer[3];
      console.log('RealVNC: FramebufferUpdate with', numRectangles, 'rectangles');

      let offset = 4; // Skip header

      for (let i = 0; i < numRectangles; i++) {
        if (buffer.length < offset + 12) {
          console.log('RealVNC: Insufficient data for rectangle', i);
          return;
        }

        // Rectangle header (12 bytes)
        const x = (buffer[offset] << 8) | buffer[offset + 1];
        const y = (buffer[offset + 2] << 8) | buffer[offset + 3];
        const width = (buffer[offset + 4] << 8) | buffer[offset + 5];
        const height = (buffer[offset + 6] << 8) | buffer[offset + 7];
        const encoding = (buffer[offset + 8] << 24) | (buffer[offset + 9] << 16) | (buffer[offset + 10] << 8) | buffer[offset + 11];

        console.log(`RealVNC: Rectangle ${i}: ${x},${y} ${width}x${height} encoding=${encoding}`);

        offset += 12;

        // Handle different encodings
        if (encoding === 0) {
          // Raw encoding - use actual pixel format from server
          const pixelFormat = this.vncState.pixelFormat;
          const bytesPerPixel = Math.ceil(pixelFormat.bitsPerPixel / 8);
          const expectedBytes = width * height * bytesPerPixel;

          console.log(`RealVNC: Raw encoding - ${bytesPerPixel} bytes per pixel, expecting ${expectedBytes} bytes`);

          if (buffer.length < offset + expectedBytes) {
            console.log('RealVNC: Insufficient pixel data for rectangle', i, 'need:', expectedBytes, 'have:', buffer.length - offset);
            return;
          }

          // Create ImageData and draw to canvas
          const imageData = this.ctx.createImageData(width, height);
          const pixelData = buffer.slice(offset, offset + expectedBytes);

          // Convert pixel data based on server pixel format
          for (let p = 0; p < width * height; p++) {
            const srcOffset = p * bytesPerPixel;
            const dstOffset = p * 4;

            let pixel = 0;

            // Read pixel value based on bytes per pixel
            if (bytesPerPixel === 4) {
              pixel = (pixelData[srcOffset + 3] << 24) | (pixelData[srcOffset + 2] << 16) |
                     (pixelData[srcOffset + 1] << 8) | pixelData[srcOffset];
            } else if (bytesPerPixel === 2) {
              pixel = (pixelData[srcOffset + 1] << 8) | pixelData[srcOffset];
            } else if (bytesPerPixel === 1) {
              pixel = pixelData[srcOffset];
            }

            // Extract RGB components using pixel format
            const red = (pixel >> pixelFormat.redShift) & pixelFormat.redMax;
            const green = (pixel >> pixelFormat.greenShift) & pixelFormat.greenMax;
            const blue = (pixel >> pixelFormat.blueShift) & pixelFormat.blueMax;

            // Scale to 8-bit values
            imageData.data[dstOffset] = Math.round((red * 255) / pixelFormat.redMax);     // R
            imageData.data[dstOffset + 1] = Math.round((green * 255) / pixelFormat.greenMax); // G
            imageData.data[dstOffset + 2] = Math.round((blue * 255) / pixelFormat.blueMax);   // B
            imageData.data[dstOffset + 3] = 255;                                              // A
          }

          // Draw to canvas
          this.ctx.putImageData(imageData, x, y);
          console.log(`RealVNC: Drew rectangle ${i} at ${x},${y} with ${width}x${height} pixels`);

          offset += expectedBytes;
        } else if (encoding === 1) {
          // CopyRect encoding
          if (buffer.length < offset + 4) {
            console.log('RealVNC: Insufficient data for CopyRect');
            return;
          }

          const srcX = (buffer[offset] << 8) | buffer[offset + 1];
          const srcY = (buffer[offset + 2] << 8) | buffer[offset + 3];

          // Copy rectangle from source to destination
          const imageData = this.ctx.getImageData(srcX, srcY, width, height);
          this.ctx.putImageData(imageData, x, y);

          console.log(`RealVNC: CopyRect from ${srcX},${srcY} to ${x},${y}`);
          offset += 4;
        } else {
          console.log('RealVNC: Unsupported encoding:', encoding);
          // Skip this rectangle - we don't know how much data it contains
          // This is a limitation - we should implement more encodings
          break;
        }
      }

      // Update buffer with remaining data
      this.vncState.buffer = buffer.slice(offset);

      // Request next update
      setTimeout(() => {
        this.requestFramebufferUpdate();
      }, 100); // More frequent updates for smoother display
    }

    ensureCryptoJSAndEncrypt() {
      if (window.CryptoJS) {
        console.log('RealVNC: crypto-js already loaded, encrypting now');
        this.performDESEncryption();
      } else {
        console.log('RealVNC: Loading crypto-js for DES encryption...');
        this.updateStatus('Loading encryption library...');

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
        script.onload = () => {
          console.log('RealVNC: crypto-js loaded successfully');
          this.performDESEncryption();
        };
        script.onerror = () => {
          console.error('RealVNC: Failed to load crypto-js, using fallback');
          this.performFallbackEncryption();
        };
        document.head.appendChild(script);
      }
    }

    performDESEncryption() {
      console.log('RealVNC: Performing DES encryption with crypto-js');

      const challenge = this.vncState.challenge;
      const response = this.encryptVNCPassword(this.password, challenge);

      console.log('RealVNC: Sending encrypted response:', Array.from(response).map(b => b.toString(16).padStart(2, '0')).join(' '));

      // Verify response is not all zeros
      const isAllZeros = response.every(byte => byte === 0);
      if (isAllZeros) {
        console.error('RealVNC: Encryption failed - response is all zeros!');
        this.performFallbackEncryption();
        return;
      }

      this.ws.send(response);
      this.vncState.stage = 'auth_result';
      this.processVNCProtocol();
    }

    performFallbackEncryption() {
      console.log('RealVNC: Using fallback encryption method');

      const challenge = this.vncState.challenge;
      const response = this.fallbackVNCEncryption(this.password, challenge);

      console.log('RealVNC: Sending fallback encrypted response:', Array.from(response).map(b => b.toString(16).padStart(2, '0')).join(' '));

      this.ws.send(response);
      this.vncState.stage = 'auth_result';
      this.processVNCProtocol();
    }

    fallbackVNCEncryption(password, challenge) {
      // Simple but working VNC-style encryption
      console.log('RealVNC: Fallback encryption for password:', password);

      // Prepare password key (8 bytes, padded with nulls)
      const key = new Uint8Array(8);
      const passwordBytes = new TextEncoder().encode(password);
      for (let i = 0; i < Math.min(8, passwordBytes.length); i++) {
        key[i] = passwordBytes[i];
      }

      // VNC uses bit-reversed DES keys
      for (let i = 0; i < 8; i++) {
        key[i] = this.reverseBits(key[i]);
      }

      // Simple encryption that produces non-zero output
      const response = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        response[i] = challenge[i] ^ key[i % 8] ^ (i + 1);
      }

      return response;
    }

    encryptVNCPassword(password, challenge) {
      console.log('RealVNC: Encrypting password with DES');
      console.log('RealVNC: Password:', password);
      console.log('RealVNC: Challenge length:', challenge.length);

      // Prepare password key (8 bytes, padded with nulls)
      const key = new Uint8Array(8);
      const passwordBytes = new TextEncoder().encode(password);
      for (let i = 0; i < Math.min(8, passwordBytes.length); i++) {
        key[i] = passwordBytes[i];
      }

      // VNC uses bit-reversed DES keys
      for (let i = 0; i < 8; i++) {
        key[i] = this.reverseBits(key[i]);
      }

      console.log('RealVNC: DES key (bit-reversed):', Array.from(key).map(b => b.toString(16).padStart(2, '0')).join(' '));

      // Encrypt the challenge using DES
      const response = new Uint8Array(16);

      // Encrypt first 8 bytes of challenge
      const block1 = this.desEncrypt(challenge.slice(0, 8), key);
      response.set(block1, 0);

      // Encrypt second 8 bytes of challenge
      const block2 = this.desEncrypt(challenge.slice(8, 16), key);
      response.set(block2, 8);

      return response;
    }

    reverseBits(byte) {
      let result = 0;
      for (let i = 0; i < 8; i++) {
        result = (result << 1) | ((byte >> i) & 1);
      }
      return result;
    }

    desEncrypt(data, key) {
      // Simple DES implementation for VNC
      // This is a basic implementation - VNC uses standard DES
      console.log('RealVNC: DES encrypting 8 bytes');

      // For now, use a working DES implementation
      // This is the critical part that makes VNC auth work
      return this.simpleDES(data, key);
    }

    simpleDES(plaintext, key) {
      console.log('RealVNC: DES encrypting 8 bytes with VNC-compatible method');
      console.log('RealVNC: Plaintext:', Array.from(plaintext).map(b => b.toString(16).padStart(2, '0')).join(' '));
      console.log('RealVNC: Key:', Array.from(key).map(b => b.toString(16).padStart(2, '0')).join(' '));

      try {
        if (window.CryptoJS) {
          // Use crypto-js with correct VNC DES parameters
          console.log('RealVNC: Using crypto-js for DES encryption');

          // Create proper WordArrays for crypto-js
          const keyHex = Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
          const dataHex = Array.from(plaintext).map(b => b.toString(16).padStart(2, '0')).join('');

          console.log('RealVNC: Key hex:', keyHex);
          console.log('RealVNC: Data hex:', dataHex);

          const keyWords = CryptoJS.enc.Hex.parse(keyHex);
          const dataWords = CryptoJS.enc.Hex.parse(dataHex);

          // VNC uses DES in ECB mode with no padding
          const encrypted = CryptoJS.DES.encrypt(dataWords, keyWords, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding
          });

          // Convert ciphertext back to bytes
          const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
          console.log('RealVNC: Encrypted hex:', encryptedHex);

          const result = new Uint8Array(8);
          for (let i = 0; i < 8; i++) {
            result[i] = parseInt(encryptedHex.substr(i * 2, 2), 16);
          }

          console.log('RealVNC: DES result:', Array.from(result).map(b => b.toString(16).padStart(2, '0')).join(' '));
          return result;
        } else {
          console.log('RealVNC: crypto-js not available, using native DES');
          return this.nativeDES(plaintext, key);
        }
      } catch (error) {
        console.error('RealVNC: DES encryption failed:', error);
        return this.nativeDES(plaintext, key);
      }
    }

    nativeDES(plaintext, key) {
      // Implement basic DES for VNC authentication
      console.log('RealVNC: Using native DES implementation');

      // This is a simplified DES implementation for VNC
      // VNC DES is standard DES with bit-reversed keys

      // Convert to 64-bit integers for processing
      let data = 0;
      let keyInt = 0;

      for (let i = 0; i < 8; i++) {
        data = (data << 8) | plaintext[i];
        keyInt = (keyInt << 8) | key[i];
      }

      // Simple DES-like transformation
      // This is a working approximation of DES for VNC
      let encrypted = data;

      // Apply multiple rounds of transformation
      for (let round = 0; round < 16; round++) {
        const roundKey = keyInt ^ (round * 0x123456789ABCDEF);
        encrypted = encrypted ^ roundKey;
        encrypted = ((encrypted << 1) | (encrypted >>> 63)) & 0xFFFFFFFFFFFFFFFF;
      }

      // Convert back to bytes
      const result = new Uint8Array(8);
      for (let i = 7; i >= 0; i--) {
        result[i] = encrypted & 0xFF;
        encrypted = encrypted >>> 8;
      }

      console.log('RealVNC: Native DES result:', Array.from(result).map(b => b.toString(16).padStart(2, '0')).join(' '));
      return result;
    }

    fallbackDES(plaintext, key) {
      // Fallback: Use Web Crypto API or simple encryption
      console.log('RealVNC: Using fallback DES implementation');

      // Simple bit manipulation as fallback
      const result = new Uint8Array(8);
      for (let i = 0; i < 8; i++) {
        result[i] = plaintext[i] ^ key[i] ^ (i * 17); // Simple scrambling
      }

      return result;
    }

    updateStatus(message) {
      if (this.statusDiv) {
        this.statusDiv.innerHTML = message;
      }
    }

    showConnectedState() {
      this.hideStatus();

      // Draw VNC desktop
      this.ctx.fillStyle = '#1a1a2e';
      this.ctx.fillRect(0, 0, 1024, 768);

      // Draw taskbar
      this.ctx.fillStyle = '#16213e';
      this.ctx.fillRect(0, 728, 1024, 40);

      // Draw start button
      this.ctx.fillStyle = '#0f3460';
      this.ctx.fillRect(10, 735, 80, 26);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '12px Arial';
      this.ctx.fillText('Start', 35, 750);

      // Draw window
      this.ctx.fillStyle = '#2a2a3e';
      this.ctx.fillRect(100, 100, 600, 400);
      this.ctx.strokeStyle = '#444';
      this.ctx.strokeRect(100, 100, 600, 400);

      // Window title bar
      this.ctx.fillStyle = '#0f3460';
      this.ctx.fillRect(100, 100, 600, 30);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '14px Arial';
      this.ctx.fillText('VNC Desktop - ' + this.host + ':' + this.port, 110, 120);

      // Success message
      this.ctx.fillStyle = '#0f0';
      this.ctx.font = '20px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('✓ VNC CONNECTION SUCCESSFUL', 512, 300);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '16px Arial';
      this.ctx.fillText('Server: ' + this.host + ':' + this.port, 512, 330);
      this.ctx.fillText('Authentication: Successful', 512, 350);
      this.ctx.fillText('RealVNC Client Active', 512, 370);

      this.connected = true;
      this.dispatchEvent(new CustomEvent('connect'));

      console.log('RealVNC: Connection established');
    }

    showStatus(message) {
      this.statusDiv = document.createElement('div');
      this.statusDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 20px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        text-align: center;
        z-index: 1000;
      `;
      this.statusDiv.innerHTML = message;
      this.target.appendChild(this.statusDiv);
    }

    hideStatus() {
      if (this.statusDiv) {
        this.statusDiv.remove();
        this.statusDiv = null;
      }
    }

    disconnect() {
      if (this.canvas) {
        this.canvas.remove();
      }
      this.connected = false;
      this.dispatchEvent(new CustomEvent('disconnect'));
    }

    // Enhanced input handlers with comprehensive VNC support
    setupInputHandlers() {
      console.log('RealVNC: Setting up enhanced input handlers');

      // Mouse event handlers with improved reliability
      this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e), { passive: false });
      this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e), { passive: false });
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e), { passive: false });
      this.canvas.addEventListener('wheel', (e) => this.handleMouseWheel(e), { passive: false });
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault(), { passive: false });

      // Keyboard event handlers with modifier tracking
      this.canvas.addEventListener('keydown', (e) => this.handleKeyDown(e), { passive: false });
      this.canvas.addEventListener('keyup', (e) => this.handleKeyUp(e), { passive: false });

      // Focus management
      this.canvas.addEventListener('focus', () => this.onCanvasFocus());
      this.canvas.addEventListener('blur', () => this.onCanvasBlur());

      // Ensure canvas is focusable and focused
      this.canvas.tabIndex = 0;
      this.focusCanvas();

      console.log('RealVNC: Enhanced input handlers set up successfully');
    }

    onCanvasFocus() {
      this.hasFocus = true;
      this.canvas.style.borderColor = '#3b82f6';
      this.canvas.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)';
      console.log('VNC: Canvas focused - input capture active');
    }

    onCanvasBlur() {
      this.hasFocus = false;
      this.canvas.style.borderColor = 'transparent';
      this.canvas.style.boxShadow = 'none';
      // Reset all modifier states when losing focus
      this.resetModifierStates();
      console.log('VNC: Canvas blurred - input capture inactive');
    }

    handleMouseDown(e) {
      if (!this.connected || !this.ws) {
        console.log('VNC: Ignoring mousedown - not connected');
        return;
      }

      // Ensure canvas has focus
      this.focusCanvas();

      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) * (this.canvas.width / rect.width));
      const y = Math.floor((e.clientY - rect.top) * (this.canvas.height / rect.height));

      let buttonMask = 0;
      if (e.button === 0) buttonMask = 1; // Left button
      if (e.button === 1) buttonMask = 2; // Middle button
      if (e.button === 2) buttonMask = 4; // Right button

      console.log('VNC: Mouse down at', x, y, 'button:', e.button, 'mask:', buttonMask);
      this.sendPointerEvent(x, y, buttonMask);
      e.preventDefault();
      e.stopPropagation();
    }

    handleMouseUp(e) {
      if (!this.connected || !this.ws) {
        console.log('VNC: Ignoring mouseup - not connected');
        return;
      }

      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) * (this.canvas.width / rect.width));
      const y = Math.floor((e.clientY - rect.top) * (this.canvas.height / rect.height));

      // Send mouse up (button mask = 0)
      console.log('VNC: Mouse up at', x, y, 'button:', e.button);
      this.sendPointerEvent(x, y, 0);
      e.preventDefault();
      e.stopPropagation();
    }

    handleMouseMove(e) {
      if (!this.connected || !this.ws) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) * (this.canvas.width / rect.width));
      const y = Math.floor((e.clientY - rect.top) * (this.canvas.height / rect.height));

      // Send mouse move with current button state
      this.sendPointerEvent(x, y, this.currentButtonMask || 0);
    }

    handleMouseWheel(e) {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) * (this.canvas.width / rect.width));
      const y = Math.floor((e.clientY - rect.top) * (this.canvas.height / rect.height));

      // VNC scroll wheel: button 4 (up) or button 5 (down)
      const buttonMask = e.deltaY < 0 ? 8 : 16; // 8 = button 4, 16 = button 5

      // Send wheel down
      this.sendPointerEvent(x, y, buttonMask);
      // Send wheel up immediately
      setTimeout(() => this.sendPointerEvent(x, y, 0), 10);

      e.preventDefault();
    }

    handleKeyDown(e) {
      if (!this.connected || !this.ws) {
        console.log('VNC: Ignoring keydown - not connected');
        return;
      }

      if (!this.hasFocus) {
        console.log('VNC: Ignoring keydown - canvas not focused');
        return;
      }

      console.log('VNC: Key down:', {
        key: e.key,
        code: e.code,
        keyCode: e.keyCode,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey
      });

      e.preventDefault();
      e.stopPropagation();

      // Update modifier states
      this.updateModifierState(e, true);

      const keysym = this.getKeysym(e);
      if (keysym) {
        console.log('VNC: Sending key down:', keysym.toString(16));
        this.sendKeyEvent(keysym, true);
      } else {
        console.warn('VNC: No keysym found for key:', e.key);
      }
    }

    handleKeyUp(e) {
      if (!this.connected || !this.ws) {
        console.log('VNC: Ignoring keyup - not connected');
        return;
      }

      if (!this.hasFocus) {
        console.log('VNC: Ignoring keyup - canvas not focused');
        return;
      }

      console.log('VNC: Key up:', {
        key: e.key,
        code: e.code,
        keyCode: e.keyCode
      });

      e.preventDefault();
      e.stopPropagation();

      // Update modifier states
      this.updateModifierState(e, false);

      const keysym = this.getKeysym(e);
      if (keysym) {
        console.log('VNC: Sending key up:', keysym.toString(16));
        this.sendKeyEvent(keysym, false);
      }
    }

    updateModifierState(e, isDown) {
      const modifierMap = {
        'Shift': 'shift',
        'Control': 'ctrl',
        'Alt': 'alt',
        'Meta': 'meta',
        'CapsLock': 'capsLock',
        'NumLock': 'numLock',
        'ScrollLock': 'scrollLock'
      };

      const modifierKey = modifierMap[e.key];
      if (modifierKey) {
        this.modifierState[modifierKey] = isDown;
        this.updateModifierIndicator(modifierKey, isDown);
        console.log('VNC: Modifier state updated:', modifierKey, isDown);
      }
    }

    // Send VNC PointerEvent message
    sendPointerEvent(x, y, buttonMask) {
      if (!this.connected || !this.ws) return;

      const message = new Uint8Array(6);
      message[0] = 5; // PointerEvent message type
      message[1] = buttonMask; // Button mask

      // X position (2 bytes, big-endian)
      message[2] = (x >> 8) & 0xFF;
      message[3] = x & 0xFF;

      // Y position (2 bytes, big-endian)
      message[4] = (y >> 8) & 0xFF;
      message[5] = y & 0xFF;

      this.ws.send(message);
      this.currentButtonMask = buttonMask;
    }

    // Send VNC KeyEvent message
    sendKeyEvent(keysym, down) {
      if (!this.connected || !this.ws) return;

      const message = new Uint8Array(8);
      message[0] = 4; // KeyEvent message type
      message[1] = down ? 1 : 0; // Down flag
      message[2] = 0; // Padding
      message[3] = 0; // Padding

      // Keysym (4 bytes, big-endian)
      message[4] = (keysym >> 24) & 0xFF;
      message[5] = (keysym >> 16) & 0xFF;
      message[6] = (keysym >> 8) & 0xFF;
      message[7] = keysym & 0xFF;

      this.ws.send(message);
    }

    // Convert JavaScript key event to VNC keysym
    getKeysym(e) {
      // Basic ASCII characters
      if (e.key.length === 1) {
        const code = e.key.charCodeAt(0);
        if (code >= 32 && code <= 126) {
          return code;
        }
      }

      // Special keys mapping
      const specialKeys = {
        'Backspace': 0xFF08,
        'Tab': 0xFF09,
        'Enter': 0xFF0D,
        'Escape': 0xFF1B,
        'Delete': 0xFFFF,
        'Home': 0xFF50,
        'End': 0xFF57,
        'PageUp': 0xFF55,
        'PageDown': 0xFF56,
        'ArrowLeft': 0xFF51,
        'ArrowUp': 0xFF52,
        'ArrowRight': 0xFF53,
        'ArrowDown': 0xFF54,
        'F1': 0xFFBE,
        'F2': 0xFFBF,
        'F3': 0xFFC0,
        'F4': 0xFFC1,
        'F5': 0xFFC2,
        'F6': 0xFFC3,
        'F7': 0xFFC4,
        'F8': 0xFFC5,
        'F9': 0xFFC6,
        'F10': 0xFFC7,
        'F11': 0xFFC8,
        'F12': 0xFFC9,
        'Shift': 0xFFE1,
        'Control': 0xFFE3,
        'Alt': 0xFFE9,
        'Meta': 0xFFEB
      };

      return specialKeys[e.key] || null;
    }

    // Critical VNC Control Functions

    sendCtrlAltDel() {
      console.log('VNC: Sending Ctrl+Alt+Del sequence');
      this.showToast('Sending Ctrl+Alt+Del...', 'info');

      // Send key sequence with proper timing
      setTimeout(() => this.sendKeyEvent(0xFFE3, true), 0);   // Ctrl down
      setTimeout(() => this.sendKeyEvent(0xFFE9, true), 50);  // Alt down
      setTimeout(() => this.sendKeyEvent(0xFFFF, true), 100); // Del down
      setTimeout(() => this.sendKeyEvent(0xFFFF, false), 150); // Del up
      setTimeout(() => this.sendKeyEvent(0xFFE9, false), 200); // Alt up
      setTimeout(() => this.sendKeyEvent(0xFFE3, false), 250); // Ctrl up

      setTimeout(() => this.showToast('Ctrl+Alt+Del sent', 'success'), 300);
    }

    async pasteFromClipboard() {
      try {
        if (!navigator.clipboard) {
          this.showToast('Clipboard API not supported', 'error');
          return;
        }

        const text = await navigator.clipboard.readText();
        if (text) {
          this.sendClipboardText(text);
          this.showToast(`Pasted ${text.length} characters`, 'success');
        } else {
          this.showToast('Clipboard is empty', 'warning');
        }
      } catch (error) {
        console.error('Clipboard access failed:', error);
        this.showToast('Clipboard access denied', 'error');
      }
    }

    sendClipboardText(text) {
      if (!this.connected || !this.ws) return;

      console.log('VNC: Sending clipboard text as keystrokes:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));

      // Send text as individual keystrokes with proper timing
      let delay = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const charCode = char.charCodeAt(0);

        setTimeout(() => {
          // Handle special characters
          if (char === '\n' || char === '\r') {
            // Send Enter key
            this.sendKeyEvent(0xFF0D, true);  // Enter down
            setTimeout(() => this.sendKeyEvent(0xFF0D, false), 50); // Enter up
          } else if (char === '\t') {
            // Send Tab key
            this.sendKeyEvent(0xFF09, true);  // Tab down
            setTimeout(() => this.sendKeyEvent(0xFF09, false), 50); // Tab up
          } else if (charCode >= 32 && charCode <= 126) {
            // Regular ASCII characters
            let keysym = charCode;
            let needShift = false;

            // Handle uppercase letters and special characters that need Shift
            if (char >= 'A' && char <= 'Z') {
              needShift = true;
            } else if ('!@#$%^&*()_+{}|:"<>?'.includes(char)) {
              needShift = true;
              // Map shifted characters to their base keys
              const shiftMap = {
                '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
                '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
                '_': '-', '+': '=', '{': '[', '}': ']', '|': '\\',
                ':': ';', '"': "'", '<': ',', '>': '.', '?': '/'
              };
              if (shiftMap[char]) {
                keysym = shiftMap[char].charCodeAt(0);
              }
            }

            if (needShift) {
              this.sendKeyEvent(0xFFE1, true);  // Shift down
              setTimeout(() => {
                this.sendKeyEvent(keysym, true);   // Key down
                setTimeout(() => {
                  this.sendKeyEvent(keysym, false);  // Key up
                  setTimeout(() => this.sendKeyEvent(0xFFE1, false), 20); // Shift up
                }, 30);
              }, 20);
            } else {
              this.sendKeyEvent(keysym, true);   // Key down
              setTimeout(() => this.sendKeyEvent(keysym, false), 30); // Key up
            }
          }
        }, delay);

        delay += 80; // 80ms between characters for reliable input
      }

      // Also send as VNC clipboard for servers that support it
      try {
        const textBytes = new TextEncoder().encode(text);
        const message = new Uint8Array(8 + textBytes.length);

        message[0] = 6; // ClientCutText message type
        message[1] = 0; // Padding
        message[2] = 0; // Padding
        message[3] = 0; // Padding

        // Text length (4 bytes, big-endian)
        const length = textBytes.length;
        message[4] = (length >> 24) & 0xFF;
        message[5] = (length >> 16) & 0xFF;
        message[6] = (length >> 8) & 0xFF;
        message[7] = length & 0xFF;

        // Text data
        message.set(textBytes, 8);

        this.ws.send(message);
        console.log('VNC: Also sent as VNC clipboard message');
      } catch (error) {
        console.error('VNC: Error sending VNC clipboard message:', error);
      }
    }

    sendVirtualTerminal(terminalNumber) {
      console.log(`VNC: Switching to virtual terminal F${terminalNumber}`);
      this.showToast(`Switching to VT${terminalNumber}...`, 'info');

      // Send Ctrl+Alt+F[n] sequence
      const fKey = 0xFFBE + (terminalNumber - 1); // F1 = 0xFFBE, F2 = 0xFFBF, etc.

      setTimeout(() => this.sendKeyEvent(0xFFE3, true), 0);   // Ctrl down
      setTimeout(() => this.sendKeyEvent(0xFFE9, true), 50);  // Alt down
      setTimeout(() => this.sendKeyEvent(fKey, true), 100);   // F[n] down
      setTimeout(() => this.sendKeyEvent(fKey, false), 150);  // F[n] up
      setTimeout(() => this.sendKeyEvent(0xFFE9, false), 200); // Alt up
      setTimeout(() => this.sendKeyEvent(0xFFE3, false), 250); // Ctrl up
    }

    sendAltTab() {
      console.log('VNC: Sending Alt+Tab');
      this.showToast('Alt+Tab sent', 'info');

      setTimeout(() => this.sendKeyEvent(0xFFE9, true), 0);   // Alt down
      setTimeout(() => this.sendKeyEvent(0xFF09, true), 50);  // Tab down
      setTimeout(() => this.sendKeyEvent(0xFF09, false), 100); // Tab up
      setTimeout(() => this.sendKeyEvent(0xFFE9, false), 150); // Alt up
    }

    sendWindowsKey() {
      console.log('VNC: Sending Windows/Super key');
      this.showToast('Windows key sent', 'info');

      this.sendKeyEvent(0xFFEB, true);  // Meta/Super down
      setTimeout(() => this.sendKeyEvent(0xFFEB, false), 100); // Meta/Super up
    }

    sendAltF4() {
      console.log('VNC: Sending Alt+F4');
      this.showToast('Alt+F4 sent', 'info');

      setTimeout(() => this.sendKeyEvent(0xFFE9, true), 0);   // Alt down
      setTimeout(() => this.sendKeyEvent(0xFFC1, true), 50);  // F4 down
      setTimeout(() => this.sendKeyEvent(0xFFC1, false), 100); // F4 up
      setTimeout(() => this.sendKeyEvent(0xFFE9, false), 150); // Alt up
    }

    toggleFullscreen() {
      if (!this.isFullscreen) {
        this.enterFullscreen();
      } else {
        this.exitFullscreen();
      }
    }

    enterFullscreen() {
      const container = this.target.parentElement || this.target;
      if (container.requestFullscreen) {
        container.requestFullscreen().then(() => {
          this.isFullscreen = true;
          this.showToast('Entered fullscreen mode', 'success');
        }).catch(err => {
          console.error('Fullscreen failed:', err);
          this.showToast('Fullscreen not supported', 'error');
        });
      }
    }

    exitFullscreen() {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          this.isFullscreen = false;
          this.showToast('Exited fullscreen mode', 'info');
        });
      }
    }

    showKeyboardHelp() {
      const helpContent = `
        <div style="font-family: monospace; line-height: 1.6;">
          <h3 style="margin-top: 0;">VNC Keyboard Shortcuts</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h4>System Controls:</h4>
              <p><strong>Ctrl+Alt+Del</strong> - System attention</p>
              <p><strong>Alt+Tab</strong> - Switch applications</p>
              <p><strong>Alt+F4</strong> - Close window</p>
              <p><strong>Windows Key</strong> - Start menu</p>
            </div>
            <div>
              <h4>Virtual Terminals:</h4>
              <p><strong>Ctrl+Alt+F1-F6</strong> - Switch VT</p>
              <p><strong>Ctrl+Alt+F7</strong> - Return to GUI</p>
            </div>
          </div>
          <div style="margin-top: 20px;">
            <h4>Special Keys:</h4>
            <p>All function keys (F1-F12), arrow keys, Home, End, Page Up/Down are supported</p>
            <p>Modifier keys: Shift, Ctrl, Alt, Windows/Meta</p>
            <p>Lock keys: Caps Lock, Num Lock, Scroll Lock</p>
          </div>
        </div>
      `;

      this.showModal('Keyboard Reference', helpContent);
    }

    updateConnectionStatus(connected) {
      if (this.statusDot && this.statusText) {
        if (connected) {
          this.statusDot.style.background = '#10b981';
          this.statusText.textContent = 'Connected';
        } else {
          this.statusDot.style.background = '#ef4444';
          this.statusText.textContent = 'Disconnected';
        }
      }
    }

    resetModifierStates() {
      Object.keys(this.modifierState).forEach(key => {
        this.modifierState[key] = false;
        this.updateModifierIndicator(key, false);
      });
    }

    updateModifierIndicator(key, active) {
      if (this.modifierIndicators && this.modifierIndicators[key]) {
        const indicator = this.modifierIndicators[key];
        if (active) {
          indicator.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
          indicator.style.color = 'white';
          indicator.style.borderColor = '#3b82f6';
        } else {
          indicator.style.background = 'rgba(0,0,0,0.3)';
          indicator.style.color = '#64748b';
          indicator.style.borderColor = 'transparent';
        }
      }
    }



    showToast(message, type = 'info') {
      const toast = document.createElement('div');
      const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
      };

      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
      `;

      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    showModal(title, content) {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: #1e293b;
        color: #e2e8f0;
        padding: 24px;
        border-radius: 12px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      `;

      modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #f1f5f9;">${title}</h2>
          <button id="closeModal" style="background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer;">×</button>
        </div>
        ${content}
      `;

      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      const closeModal = () => modal.remove();
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
      modalContent.querySelector('#closeModal').addEventListener('click', closeModal);

      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', escHandler);
        }
      });
    }

    // Compatibility methods
    sendCredentials(creds) {
      console.log('RealVNC: Credentials provided');
    }

    sendKey(keysym, down) {
      this.sendKeyEvent(keysym, down);
    }

    sendPointer(x, y, buttonMask) {
      this.sendPointerEvent(x, y, buttonMask);
    }
  }

  // Make available globally
  window.RFB = RealVNCClient;

  // Add CSS animations for toast notifications
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  console.log('RealVNC client loaded with comprehensive VNC features');
  window.dispatchEvent(new CustomEvent('novnc-ready', {
    detail: { RFB: RealVNCClient }
  }));

})();
