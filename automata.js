/**
 * Two-Way Finite Automaton (2WFA / 2DFA) Simulation Engine
 * Formal Definition: M = (Q, Sigma, vdash, dashv, delta, q0, F)
 */

class TwoWayAutomaton {
  constructor(config) {
    this.name = config.name || "Custom 2WFA";
    this.description = config.description || "";
    this.states = config.states || []; // ['q0', 'q1', 'q_acc', 'q_rej']
    this.alphabet = config.alphabet || ['0', '1'];
    this.leftMarker = '⊢';
    this.rightMarker = '⊣';
    this.startState = config.startState || 'q0';
    this.acceptStates = new Set(config.acceptStates || ['q_acc']);
    this.rejectStates = new Set(config.rejectStates || ['q_rej']);
    // delta: { [state]: { [symbol]: { nextState: 'q1', direction: 'R' | 'L' | 'S' } } }
    this.delta = config.delta || {};
    this.positions = config.positions || {}; // Optional positions for graph layout
  }

  getTransition(state, symbol) {
    if (this.delta[state] && this.delta[state][symbol]) {
      return this.delta[state][symbol];
    }
    return null; // Undefined transition implies implicit reject
  }
}

/**
 * Pre-configured 2WFA Machines illustrating key theoretical strengths of 2-way motion
 */
const PRESETS = {
  // Preset 1: Substring Pattern Matching with Backtracking (Search for "101")
  pattern101: {
    name: "Substring Matcher ('101' with Backtrack & Sweep)",
    description: "Searches for the substring '101' on the tape. Demonstrates 2-way mechanics: when '101' is detected, the head rewinds left to verify the pattern boundary, then sweeps through to the endmarker ⊣ to complete tape traversal and accept.",
    alphabet: ['0', '1'],
    states: ['q0', 'q1', 'q2', 'q_rewind', 'q_sweep', 'q_acc', 'q_rej'],
    startState: 'q0',
    acceptStates: ['q_acc'],
    rejectStates: ['q_rej'],
    defaultString: "101001",
    sampleStrings: ["101001", "101", "0010100", "1100101", "100100", "0110", "111000"],
    positions: {
      q0: { x: 90, y: 150, label: "q0: Search 1" },
      q1: { x: 240, y: 150, label: "q1: Seen 1" },
      q2: { x: 390, y: 150, label: "q2: Seen 10" },
      q_rewind: { x: 310, y: 290, label: "q_rew: Rewind L" },
      q_sweep: { x: 550, y: 150, label: "q_swp: Sweep to ⊣" },
      q_acc: { x: 740, y: 150, label: "q_acc: Accept" },
      q_rej: { x: 550, y: 310, label: "q_rej: Reject" }
    },
    delta: {
      'q0': {
        '⊢': { nextState: 'q0', direction: 'R', comment: "Start marker, advance right" },
        '0': { nextState: 'q0', direction: 'R', comment: "Skip 0, advance right" },
        '1': { nextState: 'q1', direction: 'R', comment: "Found '1', look for '0'" },
        '⊣': { nextState: 'q_rej', direction: 'S', comment: "Reached end without finding 101" }
      },
      'q1': {
        '⊢': { nextState: 'q0', direction: 'R', comment: "Safety guard" },
        '0': { nextState: 'q2', direction: 'R', comment: "Found '10', look for '1'" },
        '1': { nextState: 'q1', direction: 'R', comment: "Another '1', stay in seen-1" },
        '⊣': { nextState: 'q_rej', direction: 'S', comment: "End reached without finding 101" }
      },
      'q2': {
        '⊢': { nextState: 'q0', direction: 'R', comment: "Safety guard" },
        '1': { nextState: 'q_rewind', direction: 'L', comment: "Found '101'! Rewind left across match" },
        '0': { nextState: 'q0', direction: 'L', comment: "Mismatch '100', backtrack left to resume" },
        '⊣': { nextState: 'q_rej', direction: 'S', comment: "End reached without finding 101" }
      },
      'q_rewind': {
        '0': { nextState: 'q_rewind', direction: 'L', comment: "Rewinding over middle 0" },
        '1': { nextState: 'q_sweep', direction: 'R', comment: "Match verified at start! Sweep right to ⊣" },
        '⊢': { nextState: 'q_sweep', direction: 'R', comment: "Start of tape, sweep right" }
      },
      'q_sweep': {
        '0': { nextState: 'q_sweep', direction: 'R', comment: "Advancing right to complete tape" },
        '1': { nextState: 'q_sweep', direction: 'R', comment: "Advancing right to complete tape" },
        '⊣': { nextState: 'q_acc', direction: 'S', comment: "Reached endmarker ⊣. Tape complete, accept!" },
        '⊢': { nextState: 'q_sweep', direction: 'R', comment: "Safety guard" }
      },
      'q_acc': {
        '0': { nextState: 'q_acc', direction: 'S', comment: "Halted" },
        '1': { nextState: 'q_acc', direction: 'S', comment: "Halted" },
        '⊢': { nextState: 'q_acc', direction: 'S', comment: "Halted" },
        '⊣': { nextState: 'q_acc', direction: 'S', comment: "Halted" }
      },
      'q_rej': {
        '0': { nextState: 'q_rej', direction: 'S', comment: "Halted" },
        '1': { nextState: 'q_rej', direction: 'S', comment: "Halted" },
        '⊢': { nextState: 'q_rej', direction: 'S', comment: "Halted" },
        '⊣': { nextState: 'q_rej', direction: 'S', comment: "Halted" }
      }
    }
  },

  // Preset 2: Same First and Last Symbol (w begins and ends with the same character)
  sameEnds: {
    name: "Boundary Matcher (w starts and ends with same bit)",
    description: "Reads the first symbol at index 0, remembers it in state (q_seen0 or q_seen1), sweeps right across the tape all the way to '⊣', then steps one cell left to verify the final symbol.",
    alphabet: ['0', '1'],
    states: ['q0', 'q_scan0', 'q_scan1', 'q_verify0', 'q_verify1', 'q_acc', 'q_rej'],
    startState: 'q0',
    acceptStates: ['q_acc'],
    rejectStates: ['q_rej'],
    defaultString: "1011001",
    sampleStrings: ["1011001", "01100", "1", "0", "1000", "0111"],
    positions: {
      q0: { x: 120, y: 220, label: "q0: Read 1st" },
      q_scan0: { x: 330, y: 120, label: "q_s0: Sweep R (0)" },
      q_scan1: { x: 330, y: 320, label: "q_s1: Sweep R (1)" },
      q_verify0: { x: 550, y: 120, label: "q_v0: Check L (0)" },
      q_verify1: { x: 550, y: 320, label: "q_v1: Check L (1)" },
      q_acc: { x: 740, y: 220, label: "q_acc: Accept" },
      q_rej: { x: 550, y: 220, label: "q_rej: Reject" }
    },
    delta: {
      'q0': {
        '⊢': { nextState: 'q0', direction: 'R', comment: "Skip left marker" },
        '0': { nextState: 'q_scan0', direction: 'R', comment: "Starts with 0, scan right" },
        '1': { nextState: 'q_scan1', direction: 'R', comment: "Starts with 1, scan right" },
        '⊣': { nextState: 'q_rej', direction: 'S', comment: "Empty string" }
      },
      'q_scan0': {
        '0': { nextState: 'q_scan0', direction: 'R', comment: "Skip 0" },
        '1': { nextState: 'q_scan0', direction: 'R', comment: "Skip 1" },
        '⊣': { nextState: 'q_verify0', direction: 'L', comment: "Hit end! Step left to inspect last symbol" }
      },
      'q_scan1': {
        '0': { nextState: 'q_scan1', direction: 'R', comment: "Skip 0" },
        '1': { nextState: 'q_scan1', direction: 'R', comment: "Skip 1" },
        '⊣': { nextState: 'q_verify1', direction: 'L', comment: "Hit end! Step left to inspect last symbol" }
      },
      'q_verify0': {
        '0': { nextState: 'q_acc', direction: 'S', comment: "Matches first symbol (0)! Accept" },
        '1': { nextState: 'q_rej', direction: 'S', comment: "Mismatch (ends in 1, started with 0)" },
        '⊢': { nextState: 'q_rej', direction: 'S', comment: "Tape error" }
      },
      'q_verify1': {
        '1': { nextState: 'q_acc', direction: 'S', comment: "Matches first symbol (1)! Accept" },
        '0': { nextState: 'q_rej', direction: 'S', comment: "Mismatch (ends in 0, started with 1)" },
        '⊢': { nextState: 'q_rej', direction: 'S', comment: "Tape error" }
      },
      'q_acc': { '0': { nextState: 'q_acc', direction: 'S' }, '1': { nextState: 'q_acc', direction: 'S' }, '⊢': { nextState: 'q_acc', direction: 'S' }, '⊣': { nextState: 'q_acc', direction: 'S' } },
      'q_rej': { '0': { nextState: 'q_rej', direction: 'S' }, '1': { nextState: 'q_rej', direction: 'S' }, '⊢': { nextState: 'q_rej', direction: 'S' }, '⊣': { nextState: 'q_rej', direction: 'S' } }
    }
  },

  // Preset 3: Palindrome Check for fixed length or symmetric boundary sweep
  palindromeSweep: {
    name: "Bidirectional Sweeper (Equal 1st & 2nd Half Length/Parity)",
    description: "Simulates classic 2WFA sweeping motion between ⊢ and ⊣. Demonstrates left-to-right verification pass followed by a full rewind back to ⊢.",
    alphabet: ['0', '1'],
    states: ['q0', 'q_pass1', 'q_rewind', 'q_pass2', 'q_acc', 'q_rej'],
    startState: 'q0',
    acceptStates: ['q_acc'],
    rejectStates: ['q_rej'],
    defaultString: "101101",
    sampleStrings: ["101101", "1001", "110011", "1010", "111"],
    positions: {
      q0: { x: 120, y: 200, label: "q0: Start" },
      q_pass1: { x: 300, y: 120, label: "q1: Pass 1 ->" },
      q_rewind: { x: 500, y: 200, label: "q2: Rewind <-" },
      q_pass2: { x: 300, y: 320, label: "q3: Pass 2 ->" },
      q_acc: { x: 720, y: 200, label: "q_acc: Accept" },
      q_rej: { x: 500, y: 350, label: "q_rej: Reject" }
    },
    delta: {
      'q0': {
        '⊢': { nextState: 'q_pass1', direction: 'R', comment: "Start pass 1" },
        '0': { nextState: 'q_pass1', direction: 'R' },
        '1': { nextState: 'q_pass1', direction: 'R' },
        '⊣': { nextState: 'q_rej', direction: 'S' }
      },
      'q_pass1': {
        '0': { nextState: 'q_pass1', direction: 'R', comment: "Scanning forward" },
        '1': { nextState: 'q_pass1', direction: 'R', comment: "Scanning forward" },
        '⊣': { nextState: 'q_rewind', direction: 'L', comment: "Reached right endmarker, begin rewind!" }
      },
      'q_rewind': {
        '0': { nextState: 'q_rewind', direction: 'L', comment: "Rewinding left" },
        '1': { nextState: 'q_rewind', direction: 'L', comment: "Rewinding left" },
        '⊢': { nextState: 'q_pass2', direction: 'R', comment: "Reached left endmarker! Start second pass" }
      },
      'q_pass2': {
        '0': { nextState: 'q_pass2', direction: 'R', comment: "Verify pass" },
        '1': { nextState: 'q_pass2', direction: 'R', comment: "Verify pass" },
        '⊣': { nextState: 'q_acc', direction: 'S', comment: "Completed bidirectional verification. Accept!" }
      },
      'q_acc': { '0': { nextState: 'q_acc', direction: 'S' }, '1': { nextState: 'q_acc', direction: 'S' }, '⊢': { nextState: 'q_acc', direction: 'S' }, '⊣': { nextState: 'q_acc', direction: 'S' } },
      'q_rej': { '0': { nextState: 'q_rej', direction: 'S' }, '1': { nextState: 'q_rej', direction: 'S' }, '⊢': { nextState: 'q_rej', direction: 'S' }, '⊣': { nextState: 'q_rej', direction: 'S' } }
    }
  },

  // Preset 4: Blocks of 1s with Left-Right Ping-Pong Check
  pingPong: {
    name: "Two-Way Ping-Pong (Contains Even 1s & Odd 0s)",
    description: "Evaluates parity of 1s during a forward pass, rewinds to ⊢, then evaluates parity of 0s during a second pass.",
    alphabet: ['0', '1'],
    states: ['q_start', 'q_even1', 'q_odd1', 'q_rewind', 'q_check_even0', 'q_check_odd0', 'q_acc', 'q_rej'],
    startState: 'q_start',
    acceptStates: ['q_acc'],
    rejectStates: ['q_rej'],
    defaultString: "110",
    sampleStrings: ["110", "11000", "0", "1100", "101", "1110"],
    positions: {
      q_start: { x: 100, y: 150, label: "q_start" },
      q_even1: { x: 250, y: 120, label: "q_e1: Even 1s" },
      q_odd1: { x: 400, y: 120, label: "q_o1: Odd 1s" },
      q_rewind: { x: 550, y: 180, label: "q_rewind <-" },
      q_check_even0: { x: 250, y: 280, label: "q_e0: Even 0s" },
      q_check_odd0: { x: 400, y: 280, label: "q_o0: Odd 0s" },
      q_acc: { x: 720, y: 240, label: "q_acc: Accept" },
      q_rej: { x: 550, y: 340, label: "q_rej: Reject" }
    },
    delta: {
      'q_start': {
        '⊢': { nextState: 'q_even1', direction: 'R', comment: "Start counting 1s" },
        '0': { nextState: 'q_even1', direction: 'R' },
        '1': { nextState: 'q_odd1', direction: 'R' }
      },
      'q_even1': {
        '0': { nextState: 'q_even1', direction: 'R' },
        '1': { nextState: 'q_odd1', direction: 'R' },
        '⊣': { nextState: 'q_rewind', direction: 'L', comment: "Has even 1s! Now rewind to check 0s" }
      },
      'q_odd1': {
        '0': { nextState: 'q_odd1', direction: 'R' },
        '1': { nextState: 'q_even1', direction: 'R' },
        '⊣': { nextState: 'q_rej', direction: 'S', comment: "Odd number of 1s -> Rejected" }
      },
      'q_rewind': {
        '0': { nextState: 'q_rewind', direction: 'L', comment: "Rewind" },
        '1': { nextState: 'q_rewind', direction: 'L', comment: "Rewind" },
        '⊢': { nextState: 'q_check_even0', direction: 'R', comment: "Back at start, now count 0s" }
      },
      'q_check_even0': {
        '1': { nextState: 'q_check_even0', direction: 'R' },
        '0': { nextState: 'q_check_odd0', direction: 'R' },
        '⊣': { nextState: 'q_rej', direction: 'S', comment: "0s was even, requires odd 0s" }
      },
      'q_check_odd0': {
        '1': { nextState: 'q_check_odd0', direction: 'R' },
        '0': { nextState: 'q_check_even0', direction: 'R' },
        '⊣': { nextState: 'q_acc', direction: 'S', comment: "Even 1s and Odd 0s verified! Accept" }
      },
      'q_acc': { '0': { nextState: 'q_acc', direction: 'S' }, '1': { nextState: 'q_acc', direction: 'S' }, '⊢': { nextState: 'q_acc', direction: 'S' }, '⊣': { nextState: 'q_acc', direction: 'S' } },
      'q_rej': { '0': { nextState: 'q_rej', direction: 'S' }, '1': { nextState: 'q_rej', direction: 'S' }, '⊢': { nextState: 'q_rej', direction: 'S' }, '⊣': { nextState: 'q_rej', direction: 'S' } }
    }
  }
};

/**
 * Execution Simulator with Loop Detection & Step Timeline
 */
class SimulationRunner {
  constructor(automaton, inputString) {
    this.automaton = automaton;
    this.rawInput = inputString;
    // Tape cells:
    // index -1: ⊢ (START)
    // index 0..n-1: inputString characters
    // index n: ⊣ (HALT)
    this.symbols = inputString.split('');
    this.tapeLength = this.symbols.length;
    
    // Total physical cells array:
    // [ { pos: -1, char: '⊢', isMarker: true, label: 'START' },
    //   { pos: 0, char: '1', isMarker: false },
    //   ...
    //   { pos: n, char: '⊣', isMarker: true, label: 'HALT' } ]
    this.tape = [
      { pos: -1, char: this.automaton.leftMarker, isStart: true, label: 'START' },
      ...this.symbols.map((char, idx) => ({ pos: idx, char, isMarker: false })),
      { pos: this.tapeLength, char: this.automaton.rightMarker, isEnd: true, label: 'HALT' }
    ];

    // Precompute full run or step-by-step
    this.history = [];
    this.maxSteps = 300; // Protection against infinite cycles
    this.computeAllSteps();
  }

  getChar(pos) {
    if (pos === -1) return this.automaton.leftMarker;
    if (pos >= 0 && pos < this.tapeLength) return this.symbols[pos];
    if (pos === this.tapeLength) return this.automaton.rightMarker;
    return null;
  }

  computeAllSteps() {
    this.history = [];
    let state = this.automaton.startState;
    // Standard starting position: pos 0 if string is non-empty, or start marker -1 then moves right
    // To match screenshot 5: pos starts at index 0 on symbol '1' in state q0!
    let head = 0;
    if (this.tapeLength === 0) {
      head = -1; // on empty string, head starts at ⊢
    }

    // Track visit counts per cell
    const visitCounts = {};
    for (let i = -1; i <= this.tapeLength; i++) {
      visitCounts[i] = 0;
    }

    // Loop detection via configuration map: configuration = `${state}@${head}`
    const seenConfigs = new Map();
    let step = 0;
    let status = 'RUNNING'; // 'ACCEPTED', 'REJECTED', 'LOOP_DETECTED'
    let reason = '';

    while (step < this.maxSteps) {
      const currentChar = this.getChar(head);
      const configKey = `${state}@${head}`;
      visitCounts[head] = (visitCounts[head] || 0) + 1;

      // Check for accept state
      if (this.automaton.acceptStates.has(state)) {
        status = 'ACCEPTED';
        reason = `Automaton entered accepting state '${state}' at position ${head}.`;
        this.history.push({
          stepNumber: step,
          state,
          head,
          char: currentChar,
          nextMotion: 'HALT',
          direction: 'S',
          transition: null,
          status,
          reason,
          visitCounts: { ...visitCounts }
        });
        break;
      }

      // Check for explicit reject state
      if (this.automaton.rejectStates.has(state)) {
        status = 'REJECTED';
        reason = `Automaton entered rejecting state '${state}' at position ${head}.`;
        this.history.push({
          stepNumber: step,
          state,
          head,
          char: currentChar,
          nextMotion: 'HALT',
          direction: 'S',
          transition: null,
          status,
          reason,
          visitCounts: { ...visitCounts }
        });
        break;
      }

      // Check for infinite loop (Pigeonhole principle on 2WFA configurations)
      if (seenConfigs.has(configKey)) {
        status = 'LOOP_DETECTED';
        const prevStep = seenConfigs.get(configKey);
        reason = `Infinite cycle detected: Configuration (${state}, pos ${head}) was previously encountered at step ${prevStep}. By Pigeonhole Principle, 2WFA will loop indefinitely and is REJECTED.`;
        this.history.push({
          stepNumber: step,
          state,
          head,
          char: currentChar,
          nextMotion: 'LOOP',
          direction: 'S',
          transition: null,
          status,
          reason,
          visitCounts: { ...visitCounts }
        });
        break;
      }
      seenConfigs.set(configKey, step);

      // Fetch transition
      const trans = this.automaton.getTransition(state, currentChar);
      if (!trans) {
        status = 'REJECTED';
        reason = `No transition defined for state '${state}' scanning '${currentChar}'. Halted and rejected.`;
        this.history.push({
          stepNumber: step,
          state,
          head,
          char: currentChar,
          nextMotion: 'UNDEFINED (HALT)',
          direction: 'S',
          transition: null,
          status,
          reason,
          visitCounts: { ...visitCounts }
        });
        break;
      }

      let motionText = 'STAY (S)';
      if (trans.direction === 'R') motionText = 'RIGHT (R) →';
      if (trans.direction === 'L') motionText = 'LEFT (L) ←';

      this.history.push({
        stepNumber: step,
        state,
        head,
        char: currentChar,
        nextMotion: motionText,
        direction: trans.direction,
        transition: trans,
        nextState: trans.nextState,
        status: 'RUNNING',
        reason: trans.comment || `Transitioned to ${trans.nextState}, moved ${trans.direction}`,
        visitCounts: { ...visitCounts }
      });

      // Advance head according to direction
      let nextHead = head;
      if (trans.direction === 'R') nextHead = head + 1;
      else if (trans.direction === 'L') nextHead = head - 1;

      // Boundary safety: Left endmarker cannot be crossed to the left
      if (nextHead < -1) {
        status = 'REJECTED';
        reason = 'Automaton attempted to move left past the left endmarker ⊢. Abnormal halt.';
        break;
      }
      // Right endmarker boundary
      if (nextHead > this.tapeLength) {
        status = 'REJECTED';
        reason = 'Automaton moved right past the right endmarker ⊣. Abnormal halt.';
        break;
      }

      state = trans.nextState;
      head = nextHead;
      step++;
    }

    if (step >= this.maxSteps && status === 'RUNNING') {
      status = 'LOOP_DETECTED';
      reason = `Exceeded execution step limit (${this.maxSteps} steps). Input rejected due to non-terminating traversal.`;
    }

    this.finalStatus = status;
    this.finalReason = reason;
    this.totalSteps = this.history.length;
  }
}
