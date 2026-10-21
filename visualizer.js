/**
 * 2WFA Visualizer & Interactive Experience Controller
 * Orchestrates scroll-zoom narrative, tape rendering, SVG state graph,
 * dynamic transition table, audio synthesizer, and playback controls.
 */

// Sound Synthesizer via Web Audio API
class AudioFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playStep(direction) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      // Pitch variation based on movement direction
      const freq = direction === 'R' ? 440 : (direction === 'L' ? 360 : 300);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.2, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {
      // Audio fallback silent
    }
  }

  playAccept() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chord
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const startTime = this.ctx.currentTime + idx * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {}
  }

  playReject() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {}
  }
}

class TwoWayVisualizer {
  constructor() {
    this.currentPresetKey = 'pattern101';
    this.automaton = new TwoWayAutomaton(PRESETS[this.currentPresetKey]);
    this.runner = null;
    this.currentStepIdx = 0;
    this.isPlaying = false;
    this.playTimer = null;
    this.playbackSpeed = 1.0;
    this.audio = new AudioFX();

    this.cacheDOMElements();
    this.initScrollZoom();
    this.initEventListeners();
    this.loadPreset(this.currentPresetKey);
  }

  cacheDOMElements() {
    // Hero zoom elements
    this.heroScrollWrapper = document.getElementById('heroScrollWrapper');
    this.heroZoomContainer = document.getElementById('heroZoomContainer');
    this.scrollPromptBtn = document.getElementById('scrollPromptBtn');

    // Search bar elements
    this.presetSelect = document.getElementById('presetSelect');
    this.tapeInput = document.getElementById('tapeInput');
    this.btnLoadTape = document.getElementById('btnLoadTape');
    this.btnClearTape = document.getElementById('btnClearTape');
    this.sampleChipsContainer = document.getElementById('sampleChipsContainer');
    this.presetDescBox = document.getElementById('presetDescBox');

    // Tape Visualizer Elements (Screenshot 5)
    this.tapeTrack = document.getElementById('tapeTrack');
    this.tapeHeadFloating = document.getElementById('tapeHeadFloating');
    this.pillCurrentState = document.getElementById('pillCurrentState');
    this.pillConfiguration = document.getElementById('pillConfiguration');
    this.pillScannedSymbol = document.getElementById('pillScannedSymbol');
    this.pillNextMotion = document.getElementById('pillNextMotion');
    this.pillStepProgress = document.getElementById('pillStepProgress');

    // Controls
    this.btnPlay = document.getElementById('btnPlay');
    this.btnStepForward = document.getElementById('btnStepForward');
    this.btnStepBack = document.getElementById('btnStepBack');
    this.btnReset = document.getElementById('btnReset');
    this.speedSlider = document.getElementById('speedSlider');
    this.speedValLabel = document.getElementById('speedValLabel');
    this.btnToggleSound = document.getElementById('btnToggleSound');

    // Verdict Banner
    this.verdictBadge = document.getElementById('verdictBadge');
    this.verdictExplanation = document.getElementById('verdictExplanation');

    // Diagram & Table
    this.automataSvg = document.getElementById('automata-svg');
    this.transitionTableBody = document.getElementById('transitionTableBody');
    this.transitionTableHead = document.getElementById('transitionTableHead');

    // Trace Table
    this.traceTableBody = document.getElementById('traceTableBody');
  }

  /**
   * Scroll Zoom Narrative:
   * "as soon as you open the website, the heading should be two way finite automata.
   * then as we scroll the text zooms in and then next in the search bar you enter the string"
   */
  initScrollZoom() {
    if (!this.heroScrollWrapper || !this.heroZoomContainer) return;

    window.addEventListener('scroll', () => {
      const wrapperTop = this.heroScrollWrapper.offsetTop;
      const wrapperHeight = this.heroScrollWrapper.offsetHeight;
      const scrollY = window.scrollY;

      // Calculate progress between 0 and 1
      const progress = Math.max(0, Math.min(1, (scrollY - wrapperTop) / (wrapperHeight * 0.45)));

      // Scale zoom from 1.0 to 2.2 and gently fade out as user enters the search deck
      const scale = 1.0 + progress * 1.6;
      const opacity = 1.0 - Math.pow(progress, 1.4) * 0.85;
      const blur = progress * 4.5;

      this.heroZoomContainer.style.transform = `scale(${scale})`;
      this.heroZoomContainer.style.opacity = `${opacity}`;
      this.heroZoomContainer.style.filter = `blur(${blur}px)`;
    }, { passive: true });

    if (this.scrollPromptBtn) {
      this.scrollPromptBtn.addEventListener('click', () => {
        const searchDeck = document.getElementById('searchControlDeck');
        if (searchDeck) {
          searchDeck.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  initEventListeners() {
    // Preset change
    this.presetSelect.addEventListener('change', (e) => {
      this.loadPreset(e.target.value);
    });

    // Load tape button
    this.btnLoadTape.addEventListener('click', () => {
      this.loadString(this.tapeInput.value.trim());
    });

    // Clear input
    this.btnClearTape.addEventListener('click', () => {
      this.tapeInput.value = '';
      this.tapeInput.focus();
    });

    // Enter key triggers load
    this.tapeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.loadString(this.tapeInput.value.trim());
      }
    });

    // Controls
    this.btnPlay.addEventListener('click', () => this.togglePlay());
    this.btnStepForward.addEventListener('click', () => this.stepForward());
    this.btnStepBack.addEventListener('click', () => this.stepBack());
    this.btnReset.addEventListener('click', () => this.resetSimulation());

    // Speed slider
    this.speedSlider.addEventListener('input', (e) => {
      this.playbackSpeed = parseFloat(e.target.value);
      this.speedValLabel.textContent = `${this.playbackSpeed}x`;
      if (this.isPlaying) {
        this.pause();
        this.play();
      }
    });

    // Sound toggle
    if (this.btnToggleSound) {
      this.btnToggleSound.addEventListener('click', () => {
        this.audio.enabled = !this.audio.enabled;
        this.btnToggleSound.innerHTML = this.audio.enabled ? '🔊' : '🔇';
        this.btnToggleSound.title = this.audio.enabled ? 'Mute Sound' : 'Enable Sound';
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (document.activeElement === this.tapeInput) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.stepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.stepBack();
      } else if (e.code === 'KeyR') {
        this.resetSimulation();
      }
    });
  }

  loadPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    this.currentPresetKey = presetKey;
    this.automaton = new TwoWayAutomaton(preset);

    // Update preset description
    if (this.presetDescBox) {
      this.presetDescBox.innerHTML = `<strong>${preset.name}:</strong> ${preset.description}`;
    }

    // Populate sample chips
    this.sampleChipsContainer.innerHTML = '';
    (preset.sampleStrings || []).forEach(sample => {
      const chip = document.createElement('button');
      chip.className = 'sample-chip';
      chip.textContent = sample;
      chip.title = `Test string: "${sample}"`;
      chip.addEventListener('click', () => {
        this.tapeInput.value = sample;
        this.loadString(sample);
      });
      this.sampleChipsContainer.appendChild(chip);
    });

    // Set default string
    this.tapeInput.value = preset.defaultString || '101001';

    // Render static state transition table
    this.renderTransitionTable();

    // Render SVG state graph
    this.renderStateDiagram();

    // Load initial string
    this.loadString(this.tapeInput.value.trim());
  }

  loadString(str) {
    this.pause();
    this.runner = new SimulationRunner(this.automaton, str);
    this.currentStepIdx = 0;

    // Render physical tape cells
    this.renderTapeCells();

    // Render execution history trace log table
    this.renderTraceLog();

    // Apply first step
    this.applyStep(0);
  }

  renderTapeCells() {
    this.tapeTrack.innerHTML = '';
    
    // Create or re-attach the floating head badge inside tapeTrack
    let headBadge = document.getElementById('tapeHeadFloating');
    if (!headBadge) {
      headBadge = document.createElement('div');
      headBadge.className = 'tape-head-floating';
      headBadge.id = 'tapeHeadFloating';
      headBadge.innerHTML = 'HEAD [q0] R ▶';
    }
    this.tapeHeadFloating = headBadge;
    this.tapeTrack.appendChild(this.tapeHeadFloating);

    const tapeItems = this.runner.tape;

    tapeItems.forEach((cellData, index) => {
      const cell = document.createElement('div');
      cell.className = 'tape-cell';
      cell.id = `tape-cell-pos-${cellData.pos}`;
      cell.dataset.pos = cellData.pos;
      cell.dataset.index = index;

      if (cellData.isStart || cellData.isEnd) {
        cell.classList.add('cell-marker');
        cell.innerHTML = `
          <div class="cell-marker-label">${cellData.label}</div>
          <div class="cell-char">${cellData.char}</div>
          <div class="cell-visits" id="visits-pos-${cellData.pos}">0x</div>
        `;
      } else {
        cell.innerHTML = `
          <div class="cell-index">[${cellData.pos}]</div>
          <div class="cell-char">${cellData.char}</div>
          <div class="cell-visits" id="visits-pos-${cellData.pos}">0x</div>
        `;
      }

      this.tapeTrack.appendChild(cell);
    });
  }

  applyStep(stepIdx) {
    if (!this.runner || !this.runner.history.length) return;
    this.currentStepIdx = Math.max(0, Math.min(stepIdx, this.runner.history.length - 1));
    const stepData = this.runner.history[this.currentStepIdx];

    // 1. Update Metrics Bar (Screenshot 5 exact format)
    this.pillCurrentState.textContent = stepData.state;
    this.pillConfiguration.textContent = `(${stepData.state}, ${stepData.head})`;
    this.pillScannedSymbol.textContent = `'${stepData.char}'`;
    this.pillNextMotion.textContent = stepData.nextMotion;
    this.pillStepProgress.textContent = `${this.currentStepIdx} / ${this.runner.history.length - 1}`;

    // 2. Update Visit count badges
    if (stepData.visitCounts) {
      Object.keys(stepData.visitCounts).forEach(posStr => {
        const count = stepData.visitCounts[posStr];
        const badge = document.getElementById(`visits-pos-${posStr}`);
        if (badge) {
          badge.textContent = `${count}x`;
        }
      });
    }

    // 3. Highlight Active Cell & Position Floating Head Indicator
    document.querySelectorAll('.tape-cell').forEach(c => c.classList.remove('active-cell'));
    const activeCell = document.getElementById(`tape-cell-pos-${stepData.head}`);
    if (activeCell && this.tapeHeadFloating) {
      activeCell.classList.add('active-cell');
      activeCell.classList.add('visited-cell');

      // Calculate smooth translation offset for floating head
      const cellLeft = activeCell.offsetLeft;
      const cellWidth = activeCell.offsetWidth;
      const headWidth = this.tapeHeadFloating.offsetWidth || 110;
      const targetX = cellLeft + (cellWidth / 2) - (headWidth / 2);

      this.tapeHeadFloating.style.transform = `translateX(${targetX}px)`;

      // Head text: HEAD [q0] R ▶
      let dirSymbol = '▶';
      if (stepData.direction === 'L') dirSymbol = '◀';
      else if (stepData.direction === 'S') dirSymbol = '■';

      this.tapeHeadFloating.innerHTML = `HEAD [${stepData.state}] ${stepData.direction || 'S'} ${dirSymbol}`;

      // Scroll cell smoothly into view if track overflows
      const trackScroll = this.tapeTrack.parentElement;
      if (trackScroll) {
        const scrollLeft = activeCell.offsetLeft - trackScroll.clientWidth / 2 + cellWidth / 2;
        trackScroll.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }

    // 4. Update Dynamic State Diagram (Active Node & Edge)
    this.updateStateDiagram(stepData);

    // 5. Update Dynamic Transition Table Cell Highlight
    this.updateTransitionTable(stepData);

    // 6. Update Execution History Trace Table Row
    this.updateTraceLogRow(this.currentStepIdx);

    // 7. Update Verdict Banner
    this.updateVerdict(stepData);

    // Play step sound
    this.audio.playStep(stepData.direction);
  }

  updateVerdict(stepData) {
    this.verdictBadge.className = 'verdict-badge';

    if (this.currentStepIdx === this.runner.history.length - 1) {
      if (stepData.status === 'ACCEPTED') {
        this.verdictBadge.classList.add('status-accepted');
        this.verdictBadge.innerHTML = `✓ ACCEPTED`;
        this.verdictExplanation.textContent = stepData.reason || "Input string satisfies 2WFA language criteria and entered accepting state.";
        this.audio.playAccept();
      } else if (stepData.status === 'LOOP_DETECTED') {
        this.verdictBadge.classList.add('status-loop');
        this.verdictBadge.innerHTML = `⚠ LOOP DETECTED (REJECTED)`;
        this.verdictExplanation.textContent = stepData.reason;
        this.audio.playReject();
      } else {
        this.verdictBadge.classList.add('status-rejected');
        this.verdictBadge.innerHTML = `✗ REJECTED`;
        this.verdictExplanation.textContent = stepData.reason || "Input string is rejected (halted in non-accepting state).";
        this.audio.playReject();
      }
    } else {
      if (this.isPlaying) {
        this.verdictBadge.classList.add('status-running');
        this.verdictBadge.innerHTML = `● COMPUTING...`;
        this.verdictExplanation.textContent = `Executing bidirectional transition: scanning '${stepData.char}' in state ${stepData.state}.`;
      } else {
        this.verdictBadge.classList.add('status-ready');
        this.verdictBadge.innerHTML = `READY`;
        this.verdictExplanation.textContent = `Paused at step ${this.currentStepIdx}. Press Play or Step Forward to proceed.`;
      }
    }
  }

  /* Playback Engine */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      // If at end, loop back to start
      if (this.currentStepIdx >= this.runner.history.length - 1) {
        this.applyStep(0);
      }
      this.play();
    }
  }

  play() {
    this.isPlaying = true;
    this.btnPlay.innerHTML = `⏸ Pause`;
    this.btnPlay.classList.add('playing');

    const stepInterval = Math.max(80, Math.floor(750 / this.playbackSpeed));

    this.playTimer = setInterval(() => {
      if (this.currentStepIdx < this.runner.history.length - 1) {
        this.applyStep(this.currentStepIdx + 1);
      } else {
        this.pause();
      }
    }, stepInterval);
  }

  pause() {
    this.isPlaying = false;
    this.btnPlay.innerHTML = `▶ Play`;
    this.btnPlay.classList.remove('playing');
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
    if (this.runner && this.runner.history[this.currentStepIdx]) {
      this.updateVerdict(this.runner.history[this.currentStepIdx]);
    }
  }

  stepForward() {
    this.pause();
    if (this.runner && this.currentStepIdx < this.runner.history.length - 1) {
      this.applyStep(this.currentStepIdx + 1);
    }
  }

  stepBack() {
    this.pause();
    if (this.runner && this.currentStepIdx > 0) {
      this.applyStep(this.currentStepIdx - 1);
    }
  }

  resetSimulation() {
    this.pause();
    this.applyStep(0);
  }

  /* Dynamic State Transition Table */
  renderTransitionTable() {
    const symbols = [this.automaton.leftMarker, ...this.automaton.alphabet, this.automaton.rightMarker];
    
    // Header row
    let headHtml = `<tr><th>State (Q)</th>`;
    symbols.forEach(sym => {
      headHtml += `<th>'${sym}'</th>`;
    });
    headHtml += `</tr>`;
    this.transitionTableHead.innerHTML = headHtml;

    // Body rows
    let bodyHtml = '';
    this.automaton.states.forEach(state => {
      let isAccept = this.automaton.acceptStates.has(state);
      let isReject = this.automaton.rejectStates.has(state);
      let badge = '';
      if (isAccept) badge = ' <span style="color:#10b981;font-size:0.7em;">(F)</span>';
      if (isReject) badge = ' <span style="color:#ef4444;font-size:0.7em;">(rej)</span>';

      bodyHtml += `<tr id="tbl-row-${state}"><td><strong>${state}</strong>${badge}</td>`;
      symbols.forEach(sym => {
        const cellId = `tbl-cell-${state}-${sym}`;
        const trans = this.automaton.getTransition(state, sym);
        if (trans) {
          let dirBadge = `<span class="direction-badge-${trans.direction.toLowerCase()}">${trans.direction}</span>`;
          bodyHtml += `<td id="${cellId}">(${trans.nextState}, ${dirBadge})</td>`;
        } else {
          bodyHtml += `<td id="${cellId}" class="empty-cell">—</td>`;
        }
      });
      bodyHtml += `</tr>`;
    });
    this.transitionTableBody.innerHTML = bodyHtml;
  }

  updateTransitionTable(stepData) {
    // Clear previous highlights
    document.querySelectorAll('.transition-table tr').forEach(r => r.classList.remove('active-row'));
    document.querySelectorAll('.transition-table td').forEach(c => c.classList.remove('active-cell-highlight'));

    const row = document.getElementById(`tbl-row-${stepData.state}`);
    if (row) {
      row.classList.add('active-row');
    }

    const cell = document.getElementById(`tbl-cell-${stepData.state}-${stepData.char}`);
    if (cell) {
      cell.classList.add('active-cell-highlight');
    }
  }

  /* Dynamic State Diagram (SVG built via robust SVG template string) */
  renderStateDiagram() {
    const svg = this.automataSvg;
    const positions = this.automaton.positions;
    const states = this.automaton.states;

    // Aggregate transitions between pairs of states
    const pairTransitions = {};
    states.forEach(src => {
      const transMap = this.automaton.delta[src] || {};
      Object.keys(transMap).forEach(sym => {
        const t = transMap[sym];
        const dst = t.nextState;
        const key = `${src}->${dst}`;
        if (!pairTransitions[key]) pairTransitions[key] = { src, dst, labels: [] };
        pairTransitions[key].labels.push(`${sym}/${t.direction}`);
      });
    });

    // Build Edges SVG markup
    let edgesMarkup = '';
    Object.values(pairTransitions).forEach(edge => {
      const p1 = positions[edge.src] || { x: 150, y: 150 };
      const p2 = positions[edge.dst] || { x: 300, y: 150 };
      const labelText = edge.labels.join(', ');

      let pathD = '';
      let textX = 0, textY = 0;

      if (edge.src === edge.dst) {
        // Self loop
        const x = p1.x;
        const y = p1.y - 28;
        pathD = `M ${x - 14} ${p1.y - 24} C ${x - 36} ${y - 42}, ${x + 36} ${y - 42}, ${x + 14} ${p1.y - 24}`;
        textX = x;
        textY = y - 46;
      } else {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const curveOffset = Math.min(38, dist * 0.18);
        const nx = -dy / (dist || 1);
        const ny = dx / (dist || 1);
        const cx = midX + nx * curveOffset;
        const cy = midY + ny * curveOffset;

        pathD = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;
        textX = cx;
        textY = cy - 8;
      }

      edgesMarkup += `
        <g class="svg-edge" id="edge-${edge.src}-${edge.dst}">
          <path d="${pathD}" class="svg-edge-path" marker-end="url(#arrow)" />
          <text x="${textX}" y="${textY}" class="svg-edge-label">${labelText}</text>
        </g>
      `;
    });

    // Build Nodes SVG markup
    let nodesMarkup = '';
    states.forEach(state => {
      const pos = positions[state] || { x: 200, y: 200 };
      const isAccept = this.automaton.acceptStates.has(state);
      const isStart = state === this.automaton.startState;

      let innerCircle = isAccept ? `<circle r="22" class="svg-state-circle-inner" />` : '';
      let startArrow = '';
      if (isStart) {
        startArrow = `
          <line x1="-50" y1="0" x2="-28" y2="0" stroke="#34d399" stroke-width="2.5" marker-end="url(#arrow)" />
          <text x="-58" y="4" fill="#34d399" font-family="monospace" font-size="11" text-anchor="end">start</text>
        `;
      }

      nodesMarkup += `
        <g id="node-${state}" class="svg-state-node" transform="translate(${pos.x}, ${pos.y})">
          ${startArrow}
          <circle r="28" class="svg-state-circle" />
          ${innerCircle}
          <text class="svg-state-label">${state}</text>
        </g>
      `;
    });

    svg.innerHTML = `
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#34d399" />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#34d399" />
        </marker>
      </defs>
      <g id="svg-edges-group">${edgesMarkup}</g>
      <g id="svg-nodes-group">${nodesMarkup}</g>
    `;
  }

  updateStateDiagram(stepData) {
    // Reset all nodes and edges
    document.querySelectorAll('.svg-state-node').forEach(n => n.classList.remove('active-state'));
    document.querySelectorAll('.svg-edge-path').forEach(e => {
      e.classList.remove('active-edge');
      e.setAttribute('marker-end', 'url(#arrow)');
    });
    document.querySelectorAll('.svg-edge-label').forEach(l => l.classList.remove('active-edge-label'));

    // Highlight active state
    const node = document.getElementById(`node-${stepData.state}`);
    if (node) {
      node.classList.add('active-state');
    }

    // Highlight active edge if there is a next transition
    if (stepData.nextState) {
      const edge = document.getElementById(`edge-${stepData.state}-${stepData.nextState}`);
      if (edge) {
        const path = edge.querySelector('.svg-edge-path');
        const label = edge.querySelector('.svg-edge-label');
        if (path) {
          path.classList.add('active-edge');
          path.setAttribute('marker-end', 'url(#arrow-active)');
        }
        if (label) {
          label.classList.add('active-edge-label');
        }
      }
    }
  }

  /* Execution Trace Log */
  renderTraceLog() {
    this.traceTableBody.innerHTML = '';
    if (!this.runner) return;

    this.runner.history.forEach((step, idx) => {
      const tr = document.createElement('tr');
      tr.id = `trace-row-${idx}`;
      tr.addEventListener('click', () => {
        this.pause();
        this.applyStep(idx);
      });

      let statusPill = `<span style="color:#34d399;">${step.status}</span>`;
      if (step.status === 'ACCEPTED') statusPill = `<span style="color:#10b981;font-weight:700;">✓ ACCEPTED</span>`;
      if (step.status === 'REJECTED') statusPill = `<span style="color:#ef4444;font-weight:700;">✗ REJECTED</span>`;
      if (step.status === 'LOOP_DETECTED') statusPill = `<span style="color:#f59e0b;font-weight:700;">⚠ LOOP</span>`;

      tr.innerHTML = `
        <td>#${idx}</td>
        <td><strong>${step.state}</strong></td>
        <td>pos [${step.head}]</td>
        <td>'${step.char}'</td>
        <td>${step.nextMotion}</td>
        <td>${statusPill}</td>
        <td style="color:#94a3b8;font-size:0.75rem;">${step.reason || ''}</td>
      `;

      this.traceTableBody.appendChild(tr);
    });
  }

  updateTraceLogRow(activeIdx) {
    document.querySelectorAll('.trace-table tr').forEach(r => r.classList.remove('current-step-row'));
    const activeRow = document.getElementById(`trace-row-${activeIdx}`);
    if (activeRow) {
      activeRow.classList.add('current-step-row');
      // Scroll into view inside wrapper
      const wrapper = activeRow.parentElement.parentElement.parentElement;
      if (wrapper) {
        wrapper.scrollTop = activeRow.offsetTop - 120;
      }
    }
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.automataApp = new TwoWayVisualizer();
});
