import { Text } from "@/shared/ui/Text";
import "@/features/journey/JourneyChoices/JourneyChoices.css";

import { currentJourneyNode, journeyNode } from "@/game/journey/journey-map";
import type { PublicGame } from "@/game/types";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { JourneyMap } from "@/features/journey/JourneyMap/JourneyMap";

import { BattleModeInfo } from "@/features/journey/BattleModeInfo/BattleModeInfo";
import { JourneyStop } from "@/features/journey/JourneyStop/JourneyStop";
export function JourneyChoices({
  game,
  busy,
  onNext,
  onInspect,
}: {
  game: PublicGame;
  busy: boolean;
  onNext: (payload: object) => void;
  onInspect: (id: string) => void;
}) {
  const j = game.journey;
  if (!j)
    return (
      <GothicTextButton
        variant="primary"
        disabled={busy}
        onClick={() => onNext({})}
      >
        Новый бой
      </GothicTextButton>
    );
  const restart = game.phase === "defeat" || j.finished,
    retry = game.phase === "draw",
    current = currentJourneyNode(j),
    node = journeyNode(current, j);
  return (
    <section className="journey-choices" aria-label="Путь к боссу">
      <Text as="h3">
        {j.finished
          ? "Босс повержен!"
          : restart
            ? "Возвращение к началу карты"
            : retry
              ? "Повторить поединок"
              : node?.kind === "fight"
                ? "Выберите, куда идти"
                : node?.name}
      </Text>
      <BattleModeInfo game={game} />
      {!restart && !retry && (
        <>
          <JourneyStop
            game={game}
            busy={busy}
            onNext={onNext}
            onInspect={onInspect}
          />
        </>
      )}
      <JourneyMap
        game={game}
        busy={busy}
        onVisit={(nodeId) => onNext({ nodeId, fromNode: current })}
      />
      {restart || retry ? (
        <>
          <Text as="p">
            {j.finished
              ? "Пять побед за путешествие. Персонаж и снаряжение остаются с вами."
              : retry
                ? "Ничья не сбрасывает пройденный путь."
                : "Персонаж и снаряжение сохраняются. Путь по этой карте начнётся с первого противника."}{" "}
            Новый бой начнётся с полным здоровьем.
          </Text>
          <GothicTextButton
            variant="primary"
            disabled={busy}
            onClick={() => onNext({})}
          >
            {retry
              ? "Повторить бой"
              : j.finished
                ? "Новое путешествие"
                : "Начать сначала"}
          </GothicTextButton>
        </>
      ) : (
        <>
          <Text as="p">
            Выберите подсвеченный узел. Костёр лечит полностью, кузница — на 50%
            максимального здоровья. Прямой переход к противнику не лечит.
          </Text>
        </>
      )}
    </section>
  );
}
