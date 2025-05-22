document.addEventListener('DOMContentLoaded', () => {
  const cols = 7;
  const rows = 6;
  let board = [];
  let gameOver = false;
  const boardDiv = document.getElementById('board');
  const messageDiv = document.getElementById('message');
  const restartBtn = document.getElementById('restart');

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playDropSound() {
    if (!audioCtx) return; // Do nothing if AudioContext is not supported/initialized

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'triangle'; // Triangle wave for a softer tone
    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime); // Frequency in Hz

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); // Start at 30% volume
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2); // Fade out quickly

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2); // Sound duration 0.2 seconds
  }

  let gameMode = 'pvc'; // 'pvc' for Player vs. Computer, 'pvp' for Player vs. Player
  let currentPlayer = 1; // Player 1 or Player 2

  const pvcRadio = document.getElementById('pvc');
  const pvpRadio = document.getElementById('pvp');

  if (pvcRadio && pvpRadio) {
    pvcRadio.addEventListener('change', () => {
      if (pvcRadio.checked) {
        gameMode = 'pvc';
        initBoard();
      }
    });

    pvpRadio.addEventListener('change', () => {
      if (pvpRadio.checked) {
        gameMode = 'pvp';
        initBoard();
      }
    });
  }

  function initBoard() {
    board = Array(rows).fill(null).map(() => Array(cols).fill(0));
    boardDiv.innerHTML = '';
    boardDiv.style.gridTemplateColumns = `repeat(${cols}, 80px)`;
    boardDiv.style.gridTemplateRows = `repeat(${rows}, 80px)`;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.addEventListener('click', () => handleClick(c));
        boardDiv.appendChild(cell);
      }
    }
    currentPlayer = 1;
    if (gameMode === 'pvp') {
      messageDiv.textContent = "Player 1's turn";
    } else {
      messageDiv.textContent = 'Your turn';
    }
    gameOver = false;
  }

  function handleClick(col) {
    if (gameOver || !hasSpace(col)) return;

    const row = getAvailableRow(col);
    if (row === null) return; // Column is full

    if (gameMode === 'pvc') {
      // Player vs. Computer logic (Player is always 1)
      makeMove(row, col, 1);
      if (checkWin(board, 1)) {
        messageDiv.textContent = 'You win!';
        gameOver = true;
        return;
      }
      if (isBoardFull()) {
        messageDiv.textContent = 'Draw!';
        gameOver = true;
        return;
      }
      messageDiv.textContent = "Computer's turn";
      setTimeout(() => aiTurn(), 500);
    } else {
      // Player vs. Player logic
      makeMove(row, col, currentPlayer);
      if (checkWin(board, currentPlayer)) {
        messageDiv.textContent = `Player ${currentPlayer} wins!`;
        gameOver = true;
        return;
      }
      if (isBoardFull()) {
        messageDiv.textContent = 'Draw!';
        gameOver = true;
        return;
      }
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      messageDiv.textContent = `Player ${currentPlayer}'s turn`;
    }
  }

  function hasSpace(col) {
    return board[0][col] === 0;
  }

  function getAvailableRow(col) {
    for (let r = rows - 1; r >= 0; r--) {
      if (board[r][col] === 0) return r;
    }
    return null;
  }

  function makeMove(row, col, player) {
    board[row][col] = player;
    const idx = row * cols + col;
    // Player 1 uses 'player' class (green), Player 2 uses 'computer' class (blue)
    boardDiv.children[idx].classList.add(player === 1 ? 'player' : 'computer');
    playDropSound(); // Play sound when a move is made
  }

  function aiTurn() {
    if (gameMode !== 'pvc' || gameOver) return; // AI only plays in PVC mode and if game is not over

    const col = chooseAIMove();
    if (col === null) {
      // This case should ideally be caught by isBoardFull in handleClick
      // but as a safeguard:
      if (!isBoardFull()) { 
        // If board is not full but AI can't move, it's an issue or specific scenario
        // For now, let AI pass or handle as draw if no moves possible.
         messageDiv.textContent = 'Draw! (AI has no moves)'; 
      } else {
         messageDiv.textContent = 'Draw!';
      }
      gameOver = true;
      return;
    }
    const row = getAvailableRow(col);
    if (row === null) { // Should not happen if chooseAIMove is correct and hasSpace was checked
        console.error("AI chose a full column. This shouldn't happen.");
        return;
    }
    makeMove(row, col, 2); // AI is always player 2
    if (checkWin(board, 2)) {
      messageDiv.textContent = 'Computer wins!';
      gameOver = true;
      return;
    }
    if (isBoardFull()) {
      messageDiv.textContent = 'Draw!';
      gameOver = true;
      return;
    }
    messageDiv.textContent = 'Your turn';
  }

  function chooseAIMove() {
    // Try to win
    for (let c = 0; c < cols; c++) {
      if (!hasSpace(c)) continue;
      const r = getAvailableRow(c);
      board[r][c] = 2; // Temporarily make AI move
      if (checkWin(board, 2)) {
        board[r][c] = 0; // Reset board
        return c; // Winning move
      }
      board[r][c] = 0; // Reset board
    }

    // Try to block player's win
    for (let c = 0; c < cols; c++) {
      if (!hasSpace(c)) continue;
      const r = getAvailableRow(c);
      board[r][c] = 1; // Temporarily make player move
      if (checkWin(board, 1)) {
        board[r][c] = 0; // Reset board
        return c; // Blocking move
      }
      board[r][c] = 0; // Reset board
    }

    // Choose a random valid column
    const validCols = [];
    for (let c = 0; c < cols; c++) {
      if (hasSpace(c)) {
        validCols.push(c);
      }
    }
    if (validCols.length === 0) return null; // No valid moves
    return validCols[Math.floor(Math.random() * validCols.length)];
  }

  function isBoardFull() {
    return board.every(row => row.every(cell => cell !== 0));
  }

  function checkWin(bd, player) {
    // Horizontal check
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols - 4; c++) {
        if (bd[r][c] === player && bd[r][c+1] === player && bd[r][c+2] === player && bd[r][c+3] === player) {
          return true;
        }
      }
    }
    // Vertical check
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r <= rows - 4; r++) {
        if (bd[r][c] === player && bd[r+1][c] === player && bd[r+2][c] === player && bd[r+3][c] === player) {
          return true;
        }
      }
    }
    // Diagonal (down-right) check
    for (let r = 0; r <= rows - 4; r++) {
      for (let c = 0; c <= cols - 4; c++) {
        if (bd[r][c] === player && bd[r+1][c+1] === player && bd[r+2][c+2] === player && bd[r+3][c+3] === player) {
          return true;
        }
      }
    }
    // Diagonal (up-right) check
    for (let r = 3; r < rows; r++) {
      for (let c = 0; c <= cols - 4; c++) {
        if (bd[r][c] === player && bd[r-1][c+1] === player && bd[r-2][c+2] === player && bd[r-3][c+3] === player) {
          return true;
        }
      }
    }
    return false;
  }

  restartBtn.addEventListener('click', initBoard);
  initBoard();
});