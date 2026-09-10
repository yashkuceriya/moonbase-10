type CheckMath =
  | { kind: "groups"; groups: number; size: number }
  | { kind: "sum"; left: number; right: number }
  | { kind: "fraction"; total: number; numerator: number; denominator: number }
  | { kind: "difference"; start: number; distance: number };

export type TransferCheck = {
  prompt: string;
  options: number[];
  math: CheckMath;
  explanation: string;
};

/** Separate contexts and numbers, with no worked example shown before the attempt. */
export const TRANSFER_CHECKS: Record<string, TransferCheck> = {
  "solar-array-connect": {
    prompt: "A shuttle carries 5 trays with 7 seedlings on each tray. How many seedlings travel?",
    options: [12, 28, 35], math: { kind: "groups", groups: 5, size: 7 },
    explanation: "Each tray is one equal group. Five groups of seven make 35 seedlings.",
  },
  "cargo-bay-connect": {
    prompt: "The lab collected 38 rocks in the morning and 27 later. How many rocks altogether?",
    options: [55, 65, 75], math: { kind: "sum", left: 38, right: 27 },
    explanation: "Eight ones and seven ones make a new ten and five ones. The total is 65 rocks.",
  },
  "water-vault-connect": {
    prompt: "Three quarters of 16 battery packs go to the rover. How many packs does it get?",
    options: [4, 8, 12], math: { kind: "fraction", total: 16, numerator: 3, denominator: 4 },
    explanation: "Split 16 into four equal groups of four. Three of those groups contain 12 packs.",
  },
  "return-route-connect": {
    prompt: "A sensor is at marker 63. It moves back 27 marks. Where does it stop?",
    options: [46, 36, 44], math: { kind: "difference", start: 63, distance: 27 },
    explanation: "Jump back 20 from 63 to 43, then back seven to 36.",
  },
  "antenna-build": {
    prompt: "There are 3 boxes with 5 tools in each box. How many tools altogether?",
    options: [8, 10, 15], math: { kind: "groups", groups: 3, size: 5 },
    explanation: "Count each equal group: five, ten, fifteen. There are 15 tools.",
  },
  "greenhouse-build": {
    prompt: "Add 32 food packs and 16 food packs. How many food packs are there?",
    options: [48, 38, 46], math: { kind: "sum", left: 32, right: 16 },
    explanation: "Three tens plus one ten makes four tens. Two ones plus six ones makes eight ones: 48.",
  },
  "ration-build": {
    prompt: "Share 20 stickers equally between 4 explorers. How many stickers does each explorer get?",
    options: [4, 5, 10], math: { kind: "fraction", total: 20, numerator: 1, denominator: 4 },
    explanation: "Four equal groups of five use all 20 stickers. Each explorer gets five.",
  },
  "crater-build": {
    prompt: "A robot is at marker 56. It moves back 30 marks. Where does it land?",
    options: [23, 36, 26], math: { kind: "difference", start: 56, distance: 30 },
    explanation: "Move back three whole tens: 56, 46, 36, 26. The six ones stay the same.",
  },
  "comms-transfer": {
    prompt: "Eight storage racks each hold 4 helmets. How many helmets are stored?",
    options: [12, 32, 28], math: { kind: "groups", groups: 8, size: 4 },
    explanation: "Keep all eight equal groups. Eight groups of four make 32 helmets.",
  },
  "oxygen-transfer": {
    prompt: "The crews log 56 and 78 minutes of exploration. How many minutes in total?",
    options: [124, 144, 134], math: { kind: "sum", left: 56, right: 78 },
    explanation: "Six ones and eight ones become a ten and four ones. All the tens regroup into 134 minutes.",
  },
  "habitat-transfer": {
    prompt: "Two thirds of 24 science kits are ready. How many kits are ready?",
    options: [8, 16, 12], math: { kind: "fraction", total: 24, numerator: 2, denominator: 3 },
    explanation: "One third of 24 is eight. Two equal shares contain 16 kits.",
  },
  "drill-transfer": {
    prompt: "A cable is 82 marks long. The crew retracts 47 marks. How much cable remains?",
    options: [35, 45, 47], math: { kind: "difference", start: 82, distance: 47 },
    explanation: "Retract 40 to leave 42, then seven more to leave 35 marks.",
  },
};

export function checkAnswer(check: TransferCheck): number {
  const math = check.math;
  if (math.kind === "groups") return math.groups * math.size;
  if (math.kind === "sum") return math.left + math.right;
  if (math.kind === "fraction") return math.total / math.denominator * math.numerator;
  return math.start - math.distance;
}
