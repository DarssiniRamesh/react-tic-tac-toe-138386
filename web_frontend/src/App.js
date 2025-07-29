import React, { useState, useEffect } from 'react';
import './App.css';

// Theming: color scheme (light, minimalistic)
const COLORS = {
  primary: "#1976d2",
  secondary: "#424242",
  accent: "#ffd600",
  bg: "#ffffff",
  text: "#222",
  boardBorder: "#e9ecef",
  boxShadow: "0 2px 12px 0 rgba(197,197,197,0.07)"
};

const BOARD_SIZE = 3;

// Tiny helpers for game logic
function calculateWinner(squares) {
  // Returns 'X', 'O', or null
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  for (let line of lines) {
    const [a, b, c] = line;
    if (
      squares[a] &&
      squares[a] === squares[b] &&
      squares[a] === squares[c]
    ) {
      return squares[a];
    }
  }
  return null;
}

function boardIsFull(squares) {
  return squares.every(x => x);
}

// Returns index of the AI move
function findBestAIMove(squares, aiMark, humanMark) {
  // Basic AI: First, can win? Second, can block? Third, pick center/corner/side.
  // 1. Try to win in one move
  for (let i = 0; i < 9; ++i) {
    if (!squares[i]) {
      const copy = squares.slice();
      copy[i] = aiMark;
      if (calculateWinner(copy) === aiMark)
        return i;
    }
  }
  // 2. Block opponent's win
  for (let i = 0; i < 9; ++i) {
    if (!squares[i]) {
      const copy = squares.slice();
      copy[i] = humanMark;
      if (calculateWinner(copy) === humanMark)
        return i;
    }
  }
  // 3. Take center
  if (!squares[4]) return 4;
  // 4. Take corners if possible
  const corners = [0,2,6,8];
  for (let i of corners)
    if (!squares[i]) return i;
  // 5. Take any side
  const sides = [1,3,5,7];
  for (let i of sides)
    if (!squares[i]) return i;
  // Fallback
  return squares.findIndex(x => !x);
}

const PLAYER_LABELS = {X: "Player X", O: "Player O"};

// SQUARE COMPONENT
function Square({ value, onClick, highlight, isWinning }) {
  return (
    <button
      className="ttt-square"
      onClick={onClick}
      style={{
        color: highlight ? COLORS.primary : COLORS.secondary,
        fontWeight: isWinning ? "bold" : "normal",
        background: "#fff",
        borderColor: isWinning ? COLORS.accent : COLORS.boardBorder,
        cursor: value ? "default" : "pointer",
      }}
      tabIndex={value ? -1 : 0}
      aria-label={value || "empty"}
    >
      {value}
    </button>
  );
}

// GAME BOARD COMPONENT
function Board({ squares, onSquareClick, winningLine }) {
  const renderSquare = i =>
    <Square
      key={i}
      value={squares[i]}
      onClick={() => onSquareClick(i)}
      isWinning={winningLine && winningLine.includes(i)}
      highlight={!!squares[i]}
    />;

  let rows = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    let cells = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      cells.push(renderSquare(row * BOARD_SIZE + col));
    }
    rows.push(
      <div className="ttt-board-row" key={row}>
        {cells}
      </div>
    );
  }
  return <div className="ttt-board">{rows}</div>;
}

// PLAYER INDICATOR
function PlayerIndicator({current, vsAI, aiMark}){
  return (
    <div className="ttt-indicators" style={{
      color: COLORS.secondary,
      fontSize: "1.05em"
    }}>
      <span style={{
        fontWeight: current === 'X' ? "bold" : "normal",
        color: current === 'X' ? COLORS.primary : COLORS.secondary
      }}>
        {PLAYER_LABELS.X}
        {vsAI && aiMark==='X' && " (AI)"}
      </span>
      {" vs "}
      <span style={{
        fontWeight: current === 'O' ? "bold" : "normal",
        color: current === 'O' ? COLORS.primary : COLORS.secondary
      }}>
        {PLAYER_LABELS.O}
        {vsAI && aiMark==='O' && " (AI)"}
      </span>
    </div>
  );
}

// STATUS / WINNER DISPLAY
function GameStatus({winner, next, draw, ai, gameOver}) {
  let msg = "";
  if (winner)
    msg = winner === "draw"
      ? "It's a draw!"
      : `${PLAYER_LABELS[winner]}${ai && winner===ai ? " (AI)" : ""} wins! 🏅`;
  else if (!gameOver)
    msg = `Turn: ${PLAYER_LABELS[next]}${ai && next===ai ? " (AI)" : ""}`;
  else
    msg = "";
  return <div className="ttt-status">{msg}</div>;
}

// MOVES HISTORY
function History({history, stepNumber, onJumpTo}) {
  return (
    <div className="ttt-history">
      <h4>Move History</h4>
      <ol>
        {history.map((step, move) => {
          let desc = move ?
            `Go to move #${move} (${step.lastMoveTo!==null ? `col ${step.lastMoveTo%3 + 1}, row ${Math.floor(step.lastMoveTo/3) + 1}` : ""})` :
            'Go to game start';
          return (
            <li key={move}>
              <button
                onClick={() => onJumpTo(move)}
                className={move === stepNumber ? "ttt-history-current" : ""}
                style={{
                  background: move === stepNumber ? COLORS.accent : "#eee",
                  color: move === stepNumber ? COLORS.secondary : COLORS.primary,
                }}
              >{desc}</button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// MAIN APP
// PUBLIC_INTERFACE
function App() {
  // Theme state
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  // Game mode: PvP or PvAI
  const [vsAI, setVsAI] = useState(false);
  // Who is X: 'human' or 'ai'
  const [aiMark, setAiMark] = useState('O'); // Default AI is O
  // Game state: history of {squares, lastMoveTo, next}
  const [history, setHistory] = useState([{
    squares: Array(9).fill(null),
    lastMoveTo: null,
    next: 'X'
  }]);
  const [stepNumber, setStepNumber] = useState(0);

  const current = history[stepNumber];
  const squares = current.squares;
  const winnerMark = calculateWinner(squares);
  const isDraw = !winnerMark && boardIsFull(squares);
  const gameOver = !!winnerMark || isDraw;
  const nextMark = current.next;

  // Determine winning line for highlighting
  function getWinningLine(squares) {
    const lines = [
      [0,1,2], [3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (let line of lines) {
      const [a,b,c] = line;
      if (squares[a] && squares[a]===squares[b] && squares[a]===squares[c]) return line;
    }
    return null;
  }
  const winningLine = winnerMark ? getWinningLine(squares) : null;

  // Make move (common for both humans and AI)
  function handleSquareClick(i) {
    if (gameOver || squares[i]) return; // Can't click over
    const nextSquares = squares.slice();
    nextSquares[i] = nextMark;
    const newHistory = history.slice(0, stepNumber + 1).concat(
      [{
        squares: nextSquares,
        lastMoveTo: i,
        next: nextMark === 'X' ? 'O' : 'X'
      }]
    );
    setHistory(newHistory);
    setStepNumber(newHistory.length - 1);
  }

  // PUBLIC_INTERFACE
  // Game reset
  function resetGame() {
    setHistory([{
      squares: Array(9).fill(null), lastMoveTo: null, next: 'X'
    }]);
    setStepNumber(0);
  }

  // PUBLIC_INTERFACE
  // Switch game mode
  function handleModeSwitch(toAI) {
    resetGame();
    setVsAI(toAI);
    // When switching to PvAI always reset to human X, AI O
    setAiMark('O');
  }

  // Switch AI side
  function handleAISideChange() {
    resetGame();
    setAiMark(aiMark === "O" ? "X" : "O");
  }

  // Time travel (jump to history)
  function jumpTo(step) {
    setStepNumber(step);
  }

  // AI move effect
  useEffect(() => {
    if (
      vsAI &&
      !gameOver &&
      nextMark === aiMark
    ) {
      // Introduce a short delay for realism
      const timer = setTimeout(() => {
        const move = findBestAIMove(squares, aiMark, aiMark==='X'?'O':'X');
        if (move !== -1) handleSquareClick(move);
      }, 400 + Math.random() * 200); // 400-600 ms
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line
  }, [vsAI, aiMark, nextMark, stepNumber]) // stepNumber so that AI moves after history jump

  // Minimal inline CSS based on COLORS constant
  const minimalCss = `
  .tic-tac-toe-wrapper {
    min-height: 100vh;
    background: ${COLORS.bg};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    font-family: system-ui,sans-serif;
    color: ${COLORS.text};
    padding: 0;
  }
  .ttt-header {
    margin-top: 48px;
    font-size: 2.3rem;
    font-weight: 700;
    color: ${COLORS.primary};
    letter-spacing: -0.5px;
    margin-bottom: 18px;
    text-align: center;
    text-shadow: 0 1px 0 #fff,0 2px 8px rgba(30,30,30,0.05);
  }
  .ttt-indicators {
    font-size: 1.13rem;
    margin-bottom: 22px;
    letter-spacing: 0.1em;
    text-align: center;
  }
  .ttt-board {
    display: inline-block;
    border: 2.5px solid ${COLORS.accent};
    border-radius: 18px;
    padding: 21px 23px;
    margin-bottom: 22px;
    background: #fff;
    box-shadow: ${COLORS.boxShadow};
  }
  .ttt-board-row {
    display: flex;
  }
  .ttt-square {
    width: 68px;
    height: 68px;
    margin: 4px;
    font-size: 2.13rem;
    font-family: inherit;
    font-weight: 500;
    border: 2px solid ${COLORS.boardBorder};
    border-radius: 10px;
    background: #fff;
    outline: none;
    transition: border 0.2s, color 0.2s;
    box-shadow: 0 1px 4px rgba(35,35,35,0.025);
    will-change: border-color,color;
  }
  .ttt-square:active {
    background: #f3f3f3;
  }
  .ttt-square[aria-label="empty"]:hover {
    border-color: ${COLORS.primary};
  }
  .ttt-status {
    margin: 0.8em 0 28px 0;
    font-size: 1.25em;
    font-weight: 500;
    min-height: 30px;
    color: ${COLORS.secondary};
    letter-spacing: 0.01em;
  }
  .ttt-controls {
    display: flex;
    gap: 12px;
    margin-bottom: 22px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .ttt-controls button, .ttt-history button {
    background: ${COLORS.primary};
    color: #fff;
    border: none;
    border-radius: 7px;
    padding: 8px 20px;
    margin: 2px 0;
    font-size: 0.97em;
    cursor: pointer;
    font-weight: 500;
    outline: none;
    transition: box-shadow 0.14s, background 0.18s;
    box-shadow: 0 1px 2px rgba(20,20,20,0.05);
    letter-spacing: 0.04em;
  }
  .ttt-controls button:active, .ttt-history button:active {
    background: ${COLORS.accent};
    color: ${COLORS.secondary};
  }
  .ttt-controls .active, .ttt-history .ttt-history-current {
    background: ${COLORS.accent};
    color: ${COLORS.secondary};
    font-weight: bold;
  }
  .ttt-controls label {
    margin: 0 5px 0 3px;
    font-weight: 400;
    color: ${COLORS.secondary};
  }
  .ttt-history {
    margin-top: 12px;
    margin-bottom: 30px;
    font-size: 0.98em;
    max-width: 230px;
    background: #fafafc;
    border-radius: 7px;
    border: 1px solid #eee;
    box-shadow: 0 2px 8px rgba(200,200,200,0.04);
    padding: 10px 19px 6px 11px;
    align-self: start;
  }
  .ttt-history h4 {
    font-size: 1.02em;
    margin: 0 0 5px 3px;
    color: ${COLORS.primary};
    letter-spacing: 0.03em;
  }
  .ttt-history li {
    margin: 0 0 3px 0;
    list-style: decimal inside;
  }
  @media (max-width: 600px) {
    .ttt-header { font-size: 1.4rem; margin-top: 20px;}
    .ttt-board { padding: 7px 2px;}
    .ttt-square { width: 44px; height: 44px; font-size: 1.2rem; }
    .ttt-controls { gap: 6px; }
    .ttt-history { max-width: 120px; padding: 7px 5px;}
  }
  `;

  return (
    <div className="tic-tac-toe-wrapper">
      <style>{minimalCss}</style>
      <button 
        className="theme-toggle"
        style={{
          position: 'absolute', top: 14, right: 18,
          zIndex:2
        }}
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? "🌙 Dark" : "☀️ Light"}
      </button>
      <div className="ttt-header">
        Tic Tac Toe
      </div>
      <PlayerIndicator
        current={current.next}
        vsAI={vsAI}
        aiMark={vsAI ? aiMark : null}
      />
      <GameStatus
        winner={winnerMark || (isDraw ? "draw" : null)}
        draw={isDraw}
        next={nextMark}
        ai={vsAI ? aiMark : null}
        gameOver={gameOver}
      />
      <Board
        squares={squares}
        onSquareClick={i => {
          // If PvAI and it's AI's turn, block clicks
          if (vsAI && nextMark === aiMark) return;
          handleSquareClick(i);
        }}
        winningLine={winningLine}
      />
      {/* Controls for mode and reset */}
      <div className="ttt-controls">
        <button
          onClick={() => handleModeSwitch(false)}
          disabled={!vsAI}
          className={!vsAI ? "active" : ""}
          tabIndex={0}
        >Player vs Player</button>
        <button
          onClick={() => handleModeSwitch(true)}
          disabled={vsAI}
          className={vsAI ? "active" : ""}
          tabIndex={0}
        >Player vs AI</button>
        {vsAI && (
          <button
            onClick={handleAISideChange}
            tabIndex={0}
          >AI: {aiMark} (Switch)</button>
        )}
        <button
          onClick={resetGame}
          style={{ background: COLORS.accent, color: COLORS.secondary }}
          tabIndex={0}
        >
          Reset Game
        </button>
      </div>
      {/* Optional: Move history */}
      <History
        history={history}
        stepNumber={stepNumber}
        onJumpTo={jumpTo}
      />
      <footer style={{
        fontSize: "0.96em", color: "#aaa", marginTop: 18, marginBottom: 24,
        opacity: 0.7,
        textAlign: "center"
      }}>
        Minimalistic React Tic Tac Toe &mdash; <a href="https://reactjs.org" style={{color: COLORS.primary}}>React</a> | Theme: <span>{theme}</span>
      </footer>
    </div>
  );
}

export default App;
