// Backward-compat shim. The canonical content now lives in single_queen.ts;
// this file re-exports under the legacy symbol to avoid breaking any older
// import path. Remove once no callers remain.
export { singleQueenChecklists as queenChecklists } from "./single_queen";
