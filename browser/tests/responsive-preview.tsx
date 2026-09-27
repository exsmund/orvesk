import "@/app/styles/style.css";
import { journeyMapLayout } from "@/game/journey/journey-map";
import { CharacterCard } from "@/features/characters/CharacterCard/CharacterCard";
import { BattleHeader } from "@/features/combat/BattleHeader/BattleHeader";
// Isolated responsive fixture. Never accesses saved heroes or the game API.
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { FighterPanel } from "@/features/characters/FighterPanel/FighterPanel";
import { ReactionBoard } from "@/features/combat/ReactionBoard/ReactionBoard";
import { CombatMenu } from "@/features/combat/CombatMenu/CombatMenu";
import { JourneyScreen } from "@/features/journey/JourneyScreen/JourneyScreen";
import { StartScreen } from "@/features/home/StartScreen/StartScreen";
import { BattleModeDialog } from "@/features/combat/BattleModeDialog/BattleModeDialog";
import { pub, mapGame, noop, emptyStorage, load } from "../stories/fixtures";
import "@/app/App";
const query = new URLSearchParams(location.search);
function Content() {
  useEffect(() => {
    const timer = setTimeout(() => {
      const rect = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      };
      parent.postMessage(
        {
          responsiveReport: {
            viewport: [innerWidth, innerHeight],
            scrollWidth: document.documentElement.scrollWidth,
            player: rect(".arena-layout > .fighter-panel"),
            enemy: rect(".opponent-panel"),
            field: rect(".action-board"),
            header: rect(".battle-header"),
            content: rect(".battle-header__content"),
            mode: rect(".battle-header__mode"),
            modal: rect("dialog"),
            pageScroll:
              document.documentElement.classList.contains("modal-page-scroll"),
          },
        },
        location.origin,
      );
    }, 1400);
    return () => clearTimeout(timer);
  }, []);
  switch (query.get("screen")) {
    case "card":
      return (
        <CharacterCard
          fighter={pub.player}
          souls={12}
          busy={false}
          canUpgrade
          onUpgrade={noop}
          onInspect={noop}
          close={noop}
          onHome={noop}
          onRules={noop}
        />
      );
    case "home":
      return (
        <StartScreen
          storage={emptyStorage}
          load={load}
          onContinue={noop}
          onCreate={noop}
          onHeroes={noop}
        />
      );
    case "forge":
      return (
        <JourneyScreen
          game={{
            ...mapGame,
            phase: "ready",
            player: query.has("replacement")
              ? {
                  ...mapGame.player,
                  gear: { ...mapGame.player.gear, weapon: "club" },
                }
              : mapGame.player,
            journey: {
              ...mapGame.journey!,
              path: [
                journeyMapLayout(mapGame.journey).nodes.find(
                  (n) => n.kind === "forge",
                )!.id,
              ],
              forgeResolved: false,
              offers: ["dagger", "buckler"],
            },
          }}
          busy={false}
          onNext={noop}
          onInspect={noop}
          onHome={noop}
          onHero={noop}
          onRules={noop}
        />
      );
    case "map":
      return (
        <JourneyScreen
          game={{
            ...mapGame,
            journey: {
              ...mapGame.journey!,
              lostSouls: { nodeId: "fight-3", amount: 17 },
            },
          }}
          busy={false}
          onNext={noop}
          onInspect={noop}
          onHome={noop}
          onHero={noop}
          onRules={noop}
        />
      );
    case "modal":
      return <BattleModeDialog mode="free" onContinue={noop} />;
    default:
      return (
        <div className="app combat-app">
          <BattleHeader
            screen="battle"
            player={pub.player}
            enemy={pub.enemy}
            mode="free"
            onPlayer={noop}
            onEnemy={noop}
          />
          <div className="game-header-menu">
            {" "}
            <CombatMenu
              busy={false}
              onHome={noop}
              onMap={noop}
              onRules={noop}
            />
          </div>
          <main>
            <section className="arena-layout">
              <FighterPanel
                fighter={pub.player}
                onOpen={noop}
                onInspect={noop}
              />
              <div className="battle-center">
                <div className="fight-tab-content">
                  <ReactionBoard
                    game={pub}
                    busy={false}
                    session="responsive-preview"
                    onSubmit={async () => {}}
                    onFinish={noop}
                  />
                </div>
              </div>
              <FighterPanel
                fighter={pub.enemy}
                enemy
                onOpen={noop}
                onInspect={noop}
              />
            </section>
          </main>
        </div>
      );
  }
}
function Frame() {
  const sweep = query.has("sweep");
  const cases = sweep
    ? [
        ...[320, 599, 600, 899, 900].map((width) => ({
          screen: "battle",
          width,
          height: 800,
        })),
        { screen: "modal", width: 599, height: 800 },
        { screen: "modal", width: 600, height: 800 },
        { screen: "modal", width: 600, height: 599 },
        { screen: "modal", width: 320, height: 500 },
        { screen: "home", width: 320, height: 400 },
        { screen: "map", width: 320, height: 800 },
      ]
    : [
        {
          screen: query.get("screen") ?? "battle",
          width: Number(query.get("width") ?? 600),
          height: Number(query.get("height") ?? 800),
        },
      ];
  const [index, setIndex] = useState(0);
  const [reports, setReports] = useState<string[]>([]);
  const current = cases[index];
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || !event.data.responsiveReport)
        return;
      setReports((previous) => [
        ...previous,
        JSON.stringify({
          screen: current.screen,
          ...event.data.responsiveReport,
        }),
      ]);
      if (index < cases.length - 1) setIndex(index + 1);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [index, cases.length, current.screen]);
  return (
    <>
      <iframe
        key={index}
        title="Проверка раскладки"
        src={`?child=1&screen=${current.screen}`}
        style={{ width: current.width, height: current.height, border: 0 }}
      />
      <pre id="report" style={{ whiteSpace: "pre-wrap" }}>
        {reports.join("\n")}
      </pre>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  query.has("child") ? <Content /> : <Frame />,
);
