// Mock/demo postcards with pre-generated MiniMax art (see
// scripts/gen-mock-postcards.mjs). Each image is the pet's look in front of a
// real, recognizable landmark (Eiffel Tower / Santorini / Mt. Fuji). The bytes
// live as static files under public/mock-postcards/, referenced via `imageUrl`
// so they're baked into the record — no live generation needed. Shown to every
// user (album + postcard screen) as sample content alongside their own.
import type { Postcard } from "./types";

export const MOCK_POSTCARDS: Postcard[] = [
  {
    id: "mock-town",
    tripId: "mock-trip-town",
    companionId: "mock",
    locationName: "巴黎埃菲尔铁塔",
    destinationTheme: "town",
    title: "在小镇上慢慢地逛",
    message:
      "铁塔比我想的还要高，一直伸到云里去。\n午后的阳光很暖，街边的树影一晃一晃。\n我在塔下站了好久，决定把这一刻寄给你。",
    reason: "因为你说想去远一点的地方看看，它就一路往有名的大铁塔走了。",
    imageKey: "town",
    landmark: "巴黎埃菲尔铁塔",
    imageUrl: "/mock-postcards/town.jpg",
    imageStatus: "ready",
    sentAt: "2026-05-27T09:20:00.000Z",
  },
  {
    id: "mock-seaside",
    tripId: "mock-trip-seaside",
    companionId: "mock",
    locationName: "圣托里尼蓝顶教堂",
    destinationTheme: "seaside",
    title: "我把海风寄给你",
    message:
      "白墙蓝顶在太阳底下亮得睁不开眼。\n风里有点咸味，海一直蓝到天边。\n我捡到一枚很小的贝壳，留着带回去给你。",
    reason: "因为你拍的那片蓝色，有种很想出发的感觉，它就把我带到了海边。",
    imageKey: "seaside",
    landmark: "圣托里尼蓝顶教堂",
    imageUrl: "/mock-postcards/seaside.jpg",
    imageStatus: "ready",
    sentAt: "2026-05-24T07:05:00.000Z",
  },
  {
    id: "mock-mountain",
    tripId: "mock-trip-mountain",
    companionId: "mock",
    locationName: "富士山",
    destinationTheme: "mountain",
    title: "爬到半山就看见了云",
    message:
      "雪顶的富士山特别安静，云慢慢从山腰飘过。\n山脚的草地上开着小花，风一吹全都点头。\n我坐了好一会儿，舍不得走。",
    reason: "其实你没特别说想去哪，是它自己拐着弯挑了这座很有名的雪山。",
    imageKey: "mountain",
    landmark: "富士山",
    imageUrl: "/mock-postcards/mountain.jpg",
    imageStatus: "ready",
    sentAt: "2026-05-21T13:40:00.000Z",
  },
];
