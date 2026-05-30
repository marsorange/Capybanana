import type { CapyState } from "./types";

// A fresh capybara's starting stats. Shared by the client store and the server
// engine so a pet born in either place begins life identically.
export const DEFAULT_CAPY: CapyState = {
  mood: 62,
  energy: 70,
  curiosity: 50,
  bravery: 42,
  injury: 0,
  bond: 30,
  traits: [],
  memories: [],
};
