// Seasonal events: a few days a year Mimi's room gets a decoration and the wardrobe gets a
// costume. They come back every year, so nothing can be missed for good.

import { dayKey, daysBetween } from "../core/dates.js";
import { firstMet } from "../memory/relationship.js";

// Lunar New Year (first day) for the coming years.
const LUNAR_NEW_YEAR = ["2027-02-06", "2028-01-26", "2029-02-13", "2030-02-03", "2031-01-23", "2032-02-11", "2033-01-31", "2034-02-19", "2035-02-08"];

const monthDay = (key) => key.slice(5);
const inRange = (key, from, to) => monthDay(key) >= from && monthDay(key) <= to;

export const SEASONS = [
  {
    id: "anniversary",
    active: (key) => {
      const met = firstMet();
      return monthDay(key) === monthDay(met) && key.slice(0, 4) > met.slice(0, 4);
    },
    greet: ["happy day!", "has known you for another whole year. There's cake!"],
    line: "made a wish on the candle. It was about you.",
    good: "Cake. On our day.",
  },
  {
    id: "halloween",
    active: (key) => inRange(key, "10-18", "11-01"),
    greet: ["boo!", "is ready for Halloween. There's a witch hat and a ghost costume in the wardrobe!"],
    line: "is guarding the pumpkin from the bat.",
    good: "The pumpkin looked at me. I looked back.",
  },
  {
    id: "christmas",
    active: (key) => inRange(key, "12-18", "12-26"),
    greet: ["ho ho!", "hung a wreath. There's a Santa hat in the wardrobe!"],
    line: "wants to bat the wreath's berries.",
    good: "The wreath has berries. I'm not allowed to eat them.",
  },
  {
    id: "lunar",
    active: (key) => LUNAR_NEW_YEAR.some((d) => {
      const n = daysBetween(d, key);
      return n >= -3 && n <= 7;
    }),
    greet: ["lucky!", "hung a red lantern for the Lunar New Year. There's a lucky knot in the wardrobe!"],
    line: "thinks the lantern is very lucky.",
    good: "The red lantern glows like a warm tummy.",
  },
];

// The event on a day (first match wins), or null.
export function seasonOn(key = dayKey()) {
  return SEASONS.find((s) => s.active(key)) ?? null;
}

// Changes once a year per event, for "greet once" bookkeeping.
export const seasonKey = (season, key = dayKey()) => `${season.id}-${key.slice(0, 4)}`;
