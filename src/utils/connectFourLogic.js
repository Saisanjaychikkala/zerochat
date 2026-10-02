/**
 * ZeroChat Connect Four Matrix Logic
 * Pure deterministic win checking and grid creation.
 */

export const ROWS = 6;
export const COLS = 7;

export function createEmptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function checkConnectFourWin(board) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const p = board[r][c];
      if (p && p === board[r][c+1] && p === board[r][c+2] && p === board[r][c+3]) {
        return { winner: p, line: [[r,c], [r,c+1], [r,c+2], [r,c+3]] };
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      const p = board[r][c];
      if (p && p === board[r+1][c] && p === board[r+2][c] && p === board[r+3][c]) {
        return { winner: p, line: [[r,c], [r+1,c], [r+2,c], [r+3,c]] };
      }
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (r <= ROWS - 4 && c <= COLS - 4 && p === board[r+1][c+1] && p === board[r+2][c+2] && p === board[r+3][c+3]) {
        return { winner: p, line: [[r,c], [r+1,c+1], [r+2,c+2], [r+3,c+3]] };
      }
      if (r >= 3 && c <= COLS - 4 && p === board[r-1][c+1] && p === board[r-2][c+2] && p === board[r-3][c+3]) {
        return { winner: p, line: [[r,c], [r-1,c+1], [r-2,c+2], [r-3,c+3]] };
      }
    }
  }
  return board.every(row => row.every(Boolean)) ? { winner: 'Tie', line: [] } : null;
}
