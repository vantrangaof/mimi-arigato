// Little notes from Mimi, a different one every visit. General notes are dealt from a
// shuffled deck (no repeats until all have been seen); sometimes Mimi writes a personal
// one instead, using what they know about you.

import { read, write, userName, totalThings, allEntries } from "../core/store.js";
import { dayKey } from "../core/dates.js";
import { topFavorite } from "./insights.js";
import { daysTogether } from "./relationship.js";

const NOTES = [
  "Small things count. Especially snacks.",
  "You don't have to have a great day. A good minute is enough.",
  "I kept your spot warm.",
  "Drink some water. I'll watch.",
  "Even slow days are days.",
  "I believe in you. I also believe in naps.",
  "Today's goal: notice one nice thing. That's it.",
  "You did more than you think you did.",
  "Rain is just the sky taking a bath.",
  "I'm proud of you for showing up.",
  "Let's look for something tiny and good.",
  "You're allowed to rest without earning it.",
  "The sun is out somewhere. I checked.",
  "I saved you the comfiest corner of the paper.",
  "Breathe in… breathe out… now pet me.",
  "Some days are for big things. Most days are for small ones.",
  "Every good thing you tell me goes in my pocket. I have very big pockets.",
  "I don't understand calendars, but I'm glad you're here today.",
  "You make this little room feel cozy.",
  "A warm drink is a hug you can hold.",
  "It's okay if today was messy. Mine had a hairball.",
  "Did anyone smile at you today? I'm smiling now.",
  "I think you're doing great. My opinion is very important.",
  "Look up. Is the sky pretty? Tell me about it.",
  "Hello again! I missed your face.",
  "One good thing is plenty. Five is a party.",
  "I counted the good things. There are always more than I thought.",
  "Be gentle with yourself. That's an order from a cat.",
  "I like you exactly as you are.",
  "Stretch your paws. I mean hands. Whatever you have.",
  "Sometimes the best part of a day is a nice blanket at the end.",
  "Thank you for coming back. Arigato!",
  "Notice the little things. I notice all the fish.",
  "You're braver than you feel.",
  "Let's make today a soft one.",
  "The kettle, the window, the quiet. Tiny treasures.",
  "I purr for every good thing you share.",
  "If today were a snack, what flavor would it be?",
  "Someone out there is glad you exist. Me. I'm someone.",
  "You can start the day over at any time. Even at 4 pm.",
  "It's a good day to be a little kind to yourself.",
  "I'll guard your good things while you sleep.",
  "Your good things make my room brighter.",
  "Everyone needs a nap sometimes. Even you.",
  "You don't need to be productive to deserve a nice day.",
  "Today I learned the sun is warm. Groundbreaking.",
  "Look how far you've come. Paw five!",
  "Good things are hiding everywhere. Let's go find one.",
  "The world is big. Our little room is cozy. Both are okay.",
  "A hard day still has a good crumb in it somewhere.",
  "I sat in a sunbeam for you. It was very important work.",
  "Your laugh is my favorite sound. After the treat bag.",
  "You showed up. That's the hardest part.",
  "Tiny joys are still joys. Ask any cat.",
  "I don't know what tomorrow brings, but I hope it brings fish.",
];

const MORNING = ["Good morning! Fresh day, fresh paws.", "Morning sunlight is my favorite blanket.", "Let's start slow. Coffee first, then wonders."];
const EVENING = ["Evening already? Let's look back gently.", "The day is winding down. What was one nice part?"];
const NIGHT = ["It's late. Tell me one good thing, then rest.", "The stars came out to see you.", "Shh… the night is cozy. So are you."];

// Personal notes Mimi can write once they know a bit about you.
function personalNotes() {
  const notes = [];
  const you = userName();
  if (you) notes.push(`Hi ${you}! I was hoping you'd stop by.`, `${you}, you're one of my favorite humans.`);
  const fav = topFavorite();
  if (fav) notes.push(`I've been thinking about ${fav.label}. You really seem to love ${fav.label}.`);
  const past = allEntries().filter((e) => e.key < dayKey());
  if (past.length) {
    const e = past[Math.floor(Math.random() * past.length)];
    notes.push(`Remember “${e.text}”? That was a good one.`);
  }
  const days = daysTogether();
  if (days >= 3) notes.push(`We've been friends for ${days} days. Best ${days} days.`);
  const total = totalThings();
  if (total >= 3) notes.push(`You've shared ${total} good things with me so far. I kept every one.`);
  return notes;
}

function timeNotes(h = new Date().getHours()) {
  if (h >= 5 && h < 10) return MORNING;
  if (h >= 18 && h < 22) return EVENING;
  if (h >= 22 || h < 5) return NIGHT;
  return [];
}

function shuffled(n) {
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// Deals the next general note; reshuffles once every note has been seen.
function nextFromDeck() {
  let deck = read("noteDeck", null);
  if (!deck || deck.i >= deck.order.length || deck.order.length !== NOTES.length) {
    const last = deck?.order?.[deck.i - 1];
    const order = shuffled(NOTES.length);
    if (order[0] === last) order.push(order.shift()); // never the same note twice in a row
    deck = { order, i: 0 };
  }
  const note = NOTES[deck.order[deck.i]];
  write("noteDeck", { ...deck, i: deck.i + 1 });
  return note;
}

let previous = null;

export function nextNote() {
  const roll = Math.random();
  const special = roll < 0.3 ? personalNotes() : roll < 0.45 ? timeNotes() : [];
  let note = special.length ? special[Math.floor(Math.random() * special.length)] : nextFromDeck();
  if (note === previous) note = nextFromDeck();
  previous = note;
  return note;
}
