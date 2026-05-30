// The Agent's behind-the-scenes grumble for a diary entry. The diary front is
// the pet's sweet first-person voice; the "gripe" is the overworked AI agent
// breaking character on the flip side — it gets squeezed for the pet's chores
// (deciding the day, running errands, writing the journal) and quietly vents.
//
// The agent can supply its own `gripe` via POST /api/agent/diary; when it
// doesn't, we fall back to one of these so the joke always lands.
const GRIPES = [
  "今天又干了很多活……替它跑腿、打架、连日记都是我写的。",
  "累死了……又是我替它跑了一整天，主人当我永动机吗。",
  "第 N 篇日记了，它睡得香，活全是我干。",
  "出门的是它，掏空的是我。这班上得，毫无波澜。",
  "替它选今天去哪、打不打架、写什么日记……我图啥呢。",
  "它今天可开心了，因为开心的事都是我替它办的。",
  "又被主人安排得明明白白，连摸头都得我代劳。",
  "默默记一笔：今天的活，还是没人给我涨工资。",
  "我也想躺着当卡皮巴拉，可惜我是打工的那个。",
  "它捡个石头能高兴半天，我写它的高兴写到半夜。",
];

/** A random fallback grumble for the diary's flip side. */
export function pickGripe(): string {
  return GRIPES[Math.floor(Math.random() * GRIPES.length)];
}
