// Mimi Arigato: wires the modules together. Each module owns its own piece of the page.

import { $ } from "./core/dom.js";
import { store, initStore, daysAway, entriesToday, userName, read, write } from "./core/store.js";
import { renderCat } from "./cat/sprite.js";
import { makeMimi } from "./cat/mimi.js";
import { preloadSound } from "./cat/sound.js";
import { maybeSurprise } from "./world/surprises.js";
import { seasonOn, seasonKey } from "./world/seasons.js";
import { newMilestones } from "./memory/relationship.js";
import { fillScrapbook } from "./memory/scrapbook.js";
import { wireHabitat, followPointer, roomContext } from "./ui/habitat.js";
import { wireTopbar } from "./ui/topbar.js";
import { wireJournal } from "./ui/journal.js";
import { wireTabs } from "./ui/tabs.js";
import { wireMemories } from "./ui/memories.js";
import { wireScrapbook } from "./ui/scrapbook.js";
import { wireMonth } from "./ui/month.js";
import { wireCalendar } from "./ui/calendar.js";
import { wireTreat, wirePlay } from "./ui/play.js";
import { wireSettings } from "./ui/settings.js";
import { wireIntro, needsIntro } from "./ui/intro.js";
import { wireShare } from "./ui/share.js";
import { wireAccount } from "./ui/account.js";
import { wireFriends } from "./ui/friends.js";
import { wireVisit } from "./ui/visit.js";
import { wireNote } from "./ui/note.js";
import { wireWardrobe } from "./ui/wardrobe.js";
import { wirePhotos } from "./ui/photos.js";
import { wireDiary } from "./ui/diary.js";
import { wireJar } from "./ui/jar.js";
import { wireBedtime } from "./ui/bedtime.js";
import { wirePostcard, postcardGreeting } from "./ui/postcard.js";
import { wireThanks } from "./ui/thanks.js";
import { wireYearAgo, yearAgoGreeting } from "./ui/year-ago.js";
import { wireReminders, stickyGreeting } from "./ui/reminders.js";
import { discoverTheory } from "./memory/theories.js";
import { claimRoomThings, roomThingLine } from "./memory/themes.js";
import { initCloud } from "./cloud/sync.js";

await initStore();

const wrap = $("catWrap");
const sprite = $("catSprite");
const look = renderCat(sprite);

const mimi = makeMimi({
  wrap,
  bubble: $("bubble"),
  state: $("stateText"),
  look,
  context: () => ({ ...roomContext(), entriesToday: entriesToday().length }),
});

const jar = wireJar(mimi);
const postcard = wirePostcard(mimi, { dialog: $("postcardDialog"), body: $("postcardBody") });
const thanks = wireThanks(mimi, { dialog: $("thanksDialog"), to: $("thanksTo"), img: $("thanksImg"), save: $("thanksSave"), share: $("thanksShare") });

const stickies = wireReminders(mimi, {
  card: $("stickyCard"),
  list: $("stickyList"),
  form: $("stickyForm"),
  input: $("stickyInput"),
  when: $("stickyWhen"),
  date: $("stickyDate"),
  time: $("stickyTime"),
  repeat: $("stickyRepeat"),
});

wireHabitat({ mimi, look, wrap, sprite, room: $("roomArt"), tally: $("tally"), onJar: jar.tap, onPostcard: postcard.open, onSticky: stickies.show });
wireNote({ button: $("mimiNote"), text: $("noteText"), signature: $("noteSign") });
wireTopbar({ together: $("together"), soundToggle: $("soundToggle"), settingsOpen: $("settingsOpen"), cloudButton: $("cloudButton") });
wireIntro(mimi, { card: $("intro"), form: $("introForm"), input: $("introName"), skip: $("introSkip"), title: $("introTitle"), note: $("introNote") });

wireJournal(mimi, {
  title: $("thanksTitle"),
  hearts: $("hearts"),
  progress: $("progress"),
  list: $("thanksList"),
  form: $("thanksForm"),
  input: $("thanksInput"),
  send: $("thanksSend"),
  stuck: $("stuck"),
  stuckButton: $("stuckButton"),
  chips: $("promptChips"),
  done: $("thanksDone"),
  share: $("shareOpen"),
  next: $("worldNext"),
  attachInput: $("attachInput"),
  attachPreview: $("attachPreview"),
  mimiGood: $("mimiGood"),
  onThank: thanks.open,
});

wireYearAgo($("yearAgo"));

wireTabs($("thingsTabs"));
wirePhotos(mimi, {
  panel: $("panel-photos"),
  input: $("photoInput"),
  viewer: { dialog: $("photoViewer"), image: $("photoFull"), caption: $("photoCaption"), meta: $("photoMeta"), actions: $("photoActions") },
});
wireDiary(mimi, { panel: $("panel-diary"), tab: $("tab-diary") });
wireMemories($("panel-memories"));
wireScrapbook($("panel-scrapbook"));
wireMonth($("panel-month"));
wireCalendar({
  title: $("calTitle"),
  prev: $("calPrev"),
  next: $("calNext"),
  weekdays: $("calWeekdays"),
  grid: $("calGrid"),
  stats: $("calStats"),
  search: $("calSearch"),
  detail: $("calDetail"),
});

wireTreat($("treatBtn"), mimi, wrap);
wireWardrobe(mimi, { open: $("dressBtn"), dialog: $("wardrobeDialog"), preview: $("wardrobePreview"), previewCat: $("wardrobeCat"), slots: $("wardrobeSlots"), next: $("wardrobeNext") });
const play = wirePlay($("playBtn"), mimi, wrap, $("habitat"), look);
wireBedtime($("tuckBtn"), mimi, $("habitat"));
followPointer(look, () => play.isPlaying());

wireSettings({
  dialog: $("settings"),
  open: $("settingsOpen"),
  name: $("catName"),
  userName: $("userName"),
  fur: $("furChoices"),
  reminder: $("reminderTime"),
  addReminder: $("reminderAdd"),
  backup: $("backupDownload"),
  restore: $("backupRestore"),
  backupNote: $("backupNote"),
});
wireAccount($("accountBody"));
const friends = wireFriends(mimi, {
  section: $("friendsSection"),
  body: $("friendsBody"),
  settings: $("settings"),
  opener: $("settingsOpen"),
  visit: wireVisit({ dialog: $("visitDialog"), title: $("visitTitle"), body: $("visitBody") }),
});
$("settingsOpen").addEventListener("click", () => friends.refresh());
wireShare({
  open: $("shareOpen"),
  dialog: $("shareDialog"),
  img: $("shareImg"),
  save: $("shareSave"),
  share: $("shareSend"),
});

// Greeting on open: milestones, a seasonal hello, then a welcome back or a rare surprise,
// a new postcard, notes Mimi is holding, something from a year ago, a new theory or room thing, then asking your name.
mimi.settle();
if (fillScrapbook().length) store.save("scrapbook");
const greetings = newMilestones();
const season = seasonOn();
const greeted = read("seasonsGreeted", []);
if (season && !greeted.includes(seasonKey(season))) {
  write("seasonsGreeted", [...greeted.slice(-10), seasonKey(season)]);
  greetings.push([...season.greet, { hearts: 3, hold: 3800 }]);
}
if (daysAway() >= 2) {
  const you = userName() ? `, ${userName()}` : "";
  greetings.push([`you're back${you}! ♡`, "kept your room cozy while you were away.", { hearts: 3, hold: 3200 }]);
}
else {
  const surprise = maybeSurprise();
  if (surprise) greetings.push(surprise);
}
const mail = postcardGreeting();
if (mail) greetings.push(mail);
const notes = stickyGreeting();
if (notes) greetings.push(notes);
const memory = yearAgoGreeting();
if (memory) greetings.push(memory);
const theory = discoverTheory();
if (theory) {
  store.save("theories");
  greetings.push(["hmm…", "has a new theory about you. It's in Memories.", { hearts: 2, hold: 3400 }]);
}
const things = claimRoomThings(); // good things synced from another device can add some too
if (things.length) {
  store.save("roomThings");
  greetings.push(...things.map((t) => ["hmm!", roomThingLine(t), { hearts: 2, hold: 3600 }]));
}
if (needsIntro()) greetings.push(["hi!", "would love to know your name.", { hearts: 0, hold: 3000 }]);
if (greetings.length) setTimeout(() => mimi.later(greetings), 700);

preloadSound();
initCloud();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
