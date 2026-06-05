import type { CapyState } from "./types";

// A fresh capybara's starting stats. Shared by the client store and the server
// engine so a pet born in either place begins life identically.
export const DEFAULT_CAPY: CapyState = {
  mood: 65,
  energy: 70,
  courage: 40,
  curiosity: 50,
  injury: 0,
  traits: [],
  memories: [],
};
