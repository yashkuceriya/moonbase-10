import type { Mission } from "./missions.ts";

export type ArrayActivity = {
  mode: "count" | "restore" | "remove";
  rows: number;
  columns: number;
  initialRows: number[];
  targetRows: number[];
  instruction: string;
};

export type LearningBridge = Mission["scaffold"] & {
  title: string;
  reason: string;
  activity?: ArrayActivity;
};

const range = (size: number) => Array.from({ length: size }, (_, index) => index);

/** A reversible representation task, not another source of mastery credit. */
export function toggleBridgeRow(activity: ArrayActivity, selected: number[], row: number): number[] {
  if (!Number.isInteger(row) || row < 0 || row >= activity.rows) return selected;
  return selected.includes(row) ? selected.filter((value) => value !== row) : [...selected, row].sort((a, b) => a - b);
}

export function bridgeIsReady(activity: ArrayActivity, selected: number[]): boolean {
  return selected.length === activity.targetRows.length
    && new Set(selected).size === selected.length
    && activity.targetRows.every((row) => selected.includes(row));
}

/** All array distractors route by their numerical structure; other skills keep their authored bridge. */
export function selectLearningBridge(mission: Mission, answer: number | null): LearningBridge {
  const fallback = { ...mission.scaffold, title: "Same goal, smaller leap", reason: mission.nudge };
  if (answer === null || !mission.options.includes(answer) || answer === mission.answer || mission.visual.kind !== "array") return fallback;
  const { rows, columns } = mission.visual;
  const countedRows = answer / columns;
  if (answer !== rows + columns && Number.isInteger(countedRows) && countedRows > 0 && countedRows !== rows) {
    const missing = countedRows < rows;
    const difference = Math.abs(rows - countedRows);
    const action = missing ? "restore" : "remove";
    return {
      title: missing ? "Rebuild the missing groups" : "Remove the extra group",
      reason: `${answer} matches ${countedRows} rows of ${columns}. Let’s check that against the ${rows} rows in the mission.`,
      prompt: `The mission needs ${rows} rows. ${missing ? "Restore the missing" : "Remove the extra"} ${difference === 1 ? "row" : "rows"}. How many cells ${missing ? "did you add" : "did you remove"}?`,
      equation: `${difference} × ${columns} = ?`,
      options: [...new Set([difference, difference * columns, (difference + 1) * columns])].sort((a, b) => a - b),
      answer: difference * columns,
      coach: `Compare the row count with the mission. Keep ${rows} complete rows, each containing ${columns} cells.`,
      wrongFeedback: `Count only the cells in the ${difference} ${difference === 1 ? "row" : "rows"} you changed—not the whole panel.`,
      visual: { kind: "array", rows, columns },
      activity: {
        mode: action, rows: Math.max(rows, countedRows), columns,
        initialRows: range(countedRows), targetRows: range(rows),
        instruction: `${missing ? "Switch on" : "Switch off"} rows until rows 1–${rows} are on${missing ? "." : " and the extra row is off."} Then count the cells you changed.`,
      },
    };
  }
  // Adding factors and confusing group size need an explicit equal-group unit.
  const smallRows = 2;
  return {
    title: answer === rows + columns ? "Groups are not loose cells" : "Check the size of each group",
    reason: answer === rows + columns
      ? `${rows} + ${columns} counts two amounts. The mission asks for ${rows} equal groups, with ${columns} inside each one.`
      : `Let’s separate how many rows there are from how many cells belong in each row.`,
    prompt: `Mark both rows of ${columns} cells. How many cells do these two groups contain?`,
    equation: `${columns} + ${columns} = ?`,
    options: [...new Set([smallRows + columns, smallRows * columns, 3 * columns])].sort((a, b) => a - b),
    answer: smallRows * columns,
    coach: `One row is one group. Mark each row once, counting every cell inside it.`,
    wrongFeedback: `The row labels count groups, not extra cells. Add the cells in one row to the cells in the next.`,
    visual: { kind: "array", rows: smallRows, columns },
    activity: { mode: "count", rows: smallRows, columns, initialRows: [], targetRows: range(smallRows), instruction: "Tap each row after counting its cells. You can unmark a row and try again." },
  };
}
