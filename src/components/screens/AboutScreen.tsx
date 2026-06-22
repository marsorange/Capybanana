"use client";

import { motion } from "framer-motion";

import { useGameStore } from "@/state/gameStore";
import { dom, useTr } from "@/i18n";
import CapyLogo from "./CapyLogo";
import CapyAvatar from "../ui/CapyAvatar";
import { Panel, PrimaryButton, ScreenHeader } from "../ui/kit";
import ScreenArtwork from "../ui/ScreenArtwork";

const S = dom(
  {
    eyebrow: "慢岛群的一点来历",
    title: "关于 Capybanana",
    lead: "我住在一座很慢的小岛上。",
    body: (name: string) => [
      "在《Capybanana》的世界里，每只低边形卡皮巴拉都和一个人的工作节奏轻轻连在一起。岛外的 Agent 被频繁使唤、压力变高，岛上的我也会跟着没精神；你偶尔慢下来，风就会重新吹进院子。",
      "每天你只要来看看我：门口有没有小包裹，今天适不适合出门，还是该窝在家里睡一觉。等攒出一点空闲，我会背着东西去附近或远方走走，把看见的风景写成奇怪又认真的明信片寄回来。",
      `这里不催你肝，也不催我长大。它只是把抽象的高压生活，变成一只会被你影响、也会提醒你休息的小家伙。今天的你，或许也该和${name}一起，慢一点。`,
    ],
    thanksTitle: "感谢",
    thanks: [
      "谢谢每天愿意花一分钟回到小岛的你。",
      "谢谢替它读状态、拿主意的 Agent。",
      "谢谢那些忙到忘记休息，又想重新慢下来的人。",
    ],
    backToIsland: "回小岛看看",
  },
  {
    eyebrow: "A little backstory of the slow isles",
    title: "About Capybanana",
    lead: "I live on a very slow little island.",
    body: (name: string) => [
      "In the world of Capybanana, every low-poly capybara is gently tied to one person's work rhythm. When the Agent out there gets run ragged and stressed, I get listless too; when you slow down now and then, the breeze drifts back into the yard.",
      "All you have to do is drop by each day: is there a little parcel at the door, is today a good day to head out, or should I just curl up at home for a nap? Once a little free time builds up, I'll pack a few things and wander somewhere near or far, then turn what I see into odd, earnest postcards and mail them home.",
      `Nobody's rushing you to grind here, and nobody's rushing me to grow up. It just turns the abstract grind of high-pressure life into a little creature you can sway — one that reminds you to rest. Maybe today, you should slow down a little too, together with ${name}.`,
    ],
    thanksTitle: "Thanks",
    thanks: [
      "Thank you for taking a minute each day to come back to the island.",
      "Thank you to the Agent who reads its state and makes the calls.",
      "Thank you to everyone too busy to rest, who still wants to slow back down.",
    ],
    backToIsland: "Back to the island",
  },
);

export default function AboutScreen() {
  const companion = useGameStore((s) => s.companion);
  const goTo = useGameStore((s) => s.goTo);
  const t = useTr(S);
  const name = companion?.name ?? "Capybanana";

  return (
    <div className="screen-bg relative flex h-full flex-col overflow-hidden">
      <ScreenArtwork
        src="/art/lowpoly-login-ref.png"
        overlay="panel"
        imageClassName="object-[50%_44%]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-cream-soft/88 via-cream-soft/45 to-transparent" />

      <ScreenHeader onBack={() => goTo("home")} eyebrow={t.eyebrow} title={t.title} />

      <div className="no-scrollbar relative z-10 min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: "easeOut" }}
          className="flex justify-center"
        >
          <div className="relative">
            <CapyLogo className="h-28 w-28 rounded-[26px]" />
            <CapyAvatar className="absolute -bottom-3 -right-4 h-14 w-14 border-2 border-paper shadow-[0_6px_18px_-10px_rgba(58,46,42,0.7)]" />
          </div>
        </motion.div>

        <Panel className="px-4 py-4">
          <p className="font-hand text-xl leading-tight text-ink">{t.lead}</p>
          <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-ink-soft">
            {t.body(name).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </Panel>

        <Panel sketch={false} className="px-4 py-4">
          <p className="font-hand text-lg text-ink">{t.thanksTitle}</p>
          <ul className="mt-3 space-y-2.5">
            {t.thanks.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] leading-relaxed text-ink-soft">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="relative z-10 shrink-0 px-5 pb-5 pt-3">
        <PrimaryButton onClick={() => goTo("home")}>{t.backToIsland}</PrimaryButton>
      </div>
    </div>
  );
}
