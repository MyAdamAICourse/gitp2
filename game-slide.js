const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const LINE_COORDS = {
  "0,1,2": [8, 16.6, 92, 16.6],
  "3,4,5": [8, 50, 92, 50],
  "6,7,8": [8, 83.4, 92, 83.4],
  "0,3,6": [16.6, 8, 16.6, 92],
  "1,4,7": [50, 8, 50, 92],
  "2,5,8": [83.4, 8, 83.4, 92],
  "0,4,8": [12, 12, 88, 88],
  "2,4,6": [88, 12, 12, 88],
};

const MAX_STONES = 3;
const AI_DEPTH = 7;
const DRAW_PLIES = 48;

const boardEl = document.getElementById("board");
const cells = [...document.querySelectorAll(".cell")];
const statusEl = document.getElementById("status");
const scoreO = document.getElementById("score-o");
const scoreX = document.getElementById("score-x");
const scoreD = document.getElementById("score-d");
const labelO = document.getElementById("label-o");
const labelX = document.getElementById("label-x");
const resetBtn = document.getElementById("reset");
const undoBtn = document.getElementById("undo");
const winLine = document.getElementById("winLine");
const winSeg = document.getElementById("winSeg");

let board = Array(9).fill(null);
let stones = { o: [], x: [] };
let turn = "o";
let locked = false;
let mode = "ai";
let history = [];
let plies = 0;
const scores = { o: 0, x: 0, d: 0 };

function winnerOf(state) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (state[a] && state[a] === state[b] && state[a] === state[c]) {
      return { player: state[a], line };
    }
  }
  return null;
}

function emptyCells(state) {
  return state.map((v, i) => (v ? null : i)).filter((i) => i !== null);
}

function applyMove(state, lists, i, player) {
  const list = lists[player];
  let melted = null;
  if (list.length === MAX_STONES) {
    melted = list.shift();
    state[melted] = null;
  }
  list.push(i);
  state[i] = player;
  return melted;
}

function minimax(state, lists, isMax, depth) {
  const result = winnerOf(state);
  if (result) {
    return { score: result.player === "x" ? 20 + depth : -20 - depth };
  }
  if (depth === 0) return { score: 0 };

  const player = isMax ? "x" : "o";
  const spots = emptyCells(state);
  if (!spots.length) return { score: 0 };

  let best = { score: isMax ? -Infinity : Infinity, index: null };
  for (const i of spots) {
    const nextState = [...state];
    const nextLists = { o: [...lists.o], x: [...lists.x] };
    applyMove(nextState, nextLists, i, player);
    const next = minimax(nextState, nextLists, !isMax, depth - 1);
    if (isMax ? next.score > best.score : next.score < best.score) {
      best = { score: next.score, index: i };
    }
  }
  return best;
}

function paintCell(i, player) {
  const cell = cells[i];
  cell.innerHTML = "";
  const mark = document.createElement("span");
  mark.className = `mark ${player}`;
  cell.appendChild(mark);
  cell.disabled = true;
}

function clearCell(i) {
  cells[i].innerHTML = "";
  cells[i].disabled = false;
  cells[i].classList.remove("win", "leaving");
}

function setStatus(text) {
  statusEl.textContent = text;
}

function updateLabels() {
  if (mode === "ai") {
    labelO.textContent = "אתה";
    labelX.textContent = "מחשב";
  } else {
    labelO.textContent = "עיגול";
    labelX.textContent = "איקס";
  }
}

function markLeaving() {
  cells.forEach((cell) => cell.classList.remove("leaving"));
  if (locked) return;
  const list = stones[turn];
  if (list.length === MAX_STONES) {
    cells[list[0]].classList.add("leaving");
  }
}

function showWin(line) {
  if (!line) return;
  line.forEach((i) => cells[i].classList.add("win"));
  const coords = LINE_COORDS[line.join(",")];
  if (!coords) return;
  winSeg.setAttribute("x1", coords[0]);
  winSeg.setAttribute("y1", coords[1]);
  winSeg.setAttribute("x2", coords[2]);
  winSeg.setAttribute("y2", coords[3]);
  winLine.classList.add("show");
}

function finish(result) {
  locked = true;
  cells.forEach((cell) => cell.classList.remove("leaving"));
  if (result.player === "d") {
    scores.d += 1;
    scoreD.textContent = scores.d;
    setStatus("תיקו על הקרח");
  } else {
    scores[result.player] += 1;
    scoreO.textContent = scores.o;
    scoreX.textContent = scores.x;
    const who =
      mode === "ai"
        ? result.player === "o"
          ? "ניצחת!"
          : "המחשב ניצח"
        : result.player === "o"
          ? "עיגול ניצח"
          : "איקס ניצח";
    setStatus(who);
    showWin(result.line);
  }
  undoBtn.disabled = true;
}

function place(i, player) {
  const melted = applyMove(board, stones, i, player);
  if (melted !== null) clearCell(melted);
  history.push({ i, player, melted });
  plies += 1;
  paintCell(i, player);
  undoBtn.disabled = history.length === 0 || locked;
}

function turnStatus() {
  if (mode === "ai") {
    return turn === "o" ? "תורך — שים אבן על הקרח" : "המחשב חושב…";
  }
  return turn === "o" ? "תור העיגול" : "תור האיקס";
}

function nextTurn() {
  const result = winnerOf(board);
  if (result) {
    finish(result);
    return;
  }
  if (plies >= DRAW_PLIES) {
    finish({ player: "d", line: null });
    return;
  }
  turn = turn === "o" ? "x" : "o";
  if (mode === "ai") {
    setStatus(turnStatus());
    markLeaving();
    if (turn === "x") {
      locked = true;
      setTimeout(aiMove, 380);
    }
  } else {
    setStatus(turnStatus());
    markLeaving();
  }
}

function aiMove() {
  if (winnerOf(board)) return;
  const { index } = minimax([...board], { o: [...stones.o], x: [...stones.x] }, true, AI_DEPTH);
  locked = false;
  if (index == null) return;
  place(index, "x");
  nextTurn();
}

function onCell(i) {
  if (locked || board[i]) return;
  if (mode === "ai" && turn !== "o") return;
  place(i, turn);
  nextTurn();
}

function resetBoard(keepScores = true) {
  board = Array(9).fill(null);
  stones = { o: [], x: [] };
  turn = "o";
  locked = false;
  history = [];
  plies = 0;
  cells.forEach((cell) => {
    cell.innerHTML = "";
    cell.disabled = false;
    cell.classList.remove("win", "leaving");
  });
  winLine.classList.remove("show");
  undoBtn.disabled = true;
  if (!keepScores) {
    scores.o = scores.x = scores.d = 0;
    scoreO.textContent = scoreX.textContent = scoreD.textContent = "0";
  }
  updateLabels();
  setStatus(turnStatus());
  markLeaving();
}

function undoOne() {
  const last = history.pop();
  if (!last) return;
  board[last.i] = null;
  stones[last.player].pop();
  clearCell(last.i);
  if (last.melted !== null) {
    stones[last.player].unshift(last.melted);
    board[last.melted] = last.player;
    paintCell(last.melted, last.player);
  }
  plies = Math.max(0, plies - 1);
  turn = last.player;
}

function undo() {
  if (locked || history.length === 0) return;
  undoOne();
  if (mode === "ai" && history.length) undoOne();
  undoBtn.disabled = history.length === 0;
  setStatus(turnStatus());
  markLeaving();
}

cells.forEach((cell) => {
  cell.addEventListener("click", () => onCell(Number(cell.dataset.i)));
});

resetBtn.addEventListener("click", () => resetBoard(true));

undoBtn.addEventListener("click", undo);

document.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener("change", (e) => {
    mode = e.target.value;
    resetBoard(false);
  });
});

resetBoard(false);
