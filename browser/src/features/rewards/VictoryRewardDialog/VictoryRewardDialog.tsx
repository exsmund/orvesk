import { Text } from "@/shared/ui/Text";
import "@/features/rewards/VictoryRewardDialog/VictoryRewardDialog.css";

import { useState } from "react";
import { canUse, displaced } from "@/game/combat/engine";
import { selectedReward } from "@/game/combat/tactics";
import { item } from "@/game/equipment/catalog";
import { MAX_SKILLS, skill } from "@/game/skills/skills";
import type { PublicGame, Stat } from "@/game/types";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { ItemIcon } from "@/shared/ui/ItemIcon/ItemIcon";
import { SkillIcon } from "@/shared/ui/SkillIcon/SkillIcon";
import { CharacterStats } from "@/features/characters/CharacterStats/CharacterStats";
import { SoulBalance } from "@/features/characters/SoulBalance/SoulBalance";
import { ItemInspection } from "@/features/equipment/ItemInspection/ItemInspection";
import { SkillCard } from "@/features/skills/SkillCard/SkillCard";

import { RewardArt } from "@/features/rewards/VictoryRewardDialog/RewardArt";
import { RewardWindow } from "@/features/rewards/VictoryRewardDialog/RewardWindow";
import { rewardName } from "@/features/rewards/VictoryRewardDialog/model";
export function VictoryRewardDialog({
  game,
  busy,
  index,
  onSelect,
  onClaim,
  onSpend,
  error,
}: {
  game: PublicGame;
  busy: boolean;
  index: number;
  onSelect: (index: number) => void;
  onClaim: (
    selection: "souls" | "equip" | "learn",
    replaceSkillId?: string,
    skillSlot?: number,
  ) => void;
  onSpend: (stat: Stat) => void;
  error?: string;
}) {
  const [detail, setDetail] = useState(false),
    [slot, setSlot] = useState<number | null>(null);
  const reward = selectedReward(game, index),
    p = game.player,
    souls = game.souls;
  if (game.phase !== "victory" || !reward) return null;
  const equipment = reward.kind === "item" ? item(reward.itemId) : null;
  const usable = !equipment || canUse(p, equipment),
    replacement = slot === null ? undefined : (p.skills?.[slot] ?? undefined);
  const duplicate =
    reward.kind === "skill" && p.skills?.includes(reward.skillId);
  const cancel = () => {
    if (!busy) {
      setDetail(false);
      setSlot(null);
    }
  };
  const accept = () => {
    if (busy) return;
    if (reward.kind === "souls") onClaim("souls");
    else if (reward.kind === "item" && usable) onClaim("equip");
    else if (reward.kind === "skill" && slot !== null && !duplicate)
      onClaim("learn", replacement, slot);
  };
  const acceptLabel =
    reward.kind === "souls"
      ? "Получить"
      : reward.kind === "item"
        ? "Надеть предмет"
        : replacement
          ? "Заменить навык"
          : "Изучить навык";
  return (
    <>
      <RewardWindow title="Выберите награду" hint="Выберите одну награду">
        <div className="reward-gallery" role="group" aria-label="Награды">
          {(game.rewardOptions ?? [reward]).map((option, i) => (
            <button
              type="button"
              className="reward-tile"
              key={i}
              aria-label={rewardName(option)}
              aria-haspopup="dialog"
              disabled={busy}
              onClick={() => {
                onSelect(i);
                setSlot(null);
                setDetail(true);
              }}
            >
              <RewardArt reward={option} />
              {option.kind === "souls" && (
                <Text as="b" className="soul-reward-amount">
                  {option.amount}
                </Text>
              )}
            </button>
          ))}
        </div>
      </RewardWindow>
      {detail && (
        <RewardWindow
          title={reward.kind === "souls" ? "Награда" : rewardName(reward)}
          cancel={cancel}
          footer={
            <>
              <GothicTextButton
                variant="secondary"
                disabled={busy}
                onClick={cancel}
              >
                Отмена
              </GothicTextButton>
              <GothicTextButton
                variant="primary"
                disabled={
                  busy ||
                  !usable ||
                  (reward.kind === "skill" && (slot === null || !!duplicate))
                }
                onClick={accept}
              >
                {acceptLabel}
              </GothicTextButton>
            </>
          }
        >
          {error && (
            <Text as="p" className="error" role="alert">
              {error}
            </Text>
          )}
          {reward.kind === "souls" ? (
            <div className="soul-reward-detail">
              <div className="soul-reward-change">
                <SoulBalance amount={souls} />
                <Text as="span">→</Text>
                <SoulBalance amount={souls + reward.amount} />
              </div>
              <Text as="p">
                +<SoulBalance amount={reward.amount} />
              </Text>
              <Text as="small">
                Тратьте вне боя. При поражении непотраченные осколки теряются.
              </Text>
            </div>
          ) : reward.kind === "skill" ? (
            <div className="skill-reward-detail">
              <SkillIcon
                className="reward-skill-art"
                id={reward.skillId}
                size={140}
                framed
              />
              <SkillCard id={reward.skillId} fighter={p} />
              <Text as="h3">Выберите ячейку навыка</Text>
              <div
                className="reward-skill-slots"
                role="group"
                aria-label="Ячейка навыка"
              >
                {Array.from({ length: MAX_SKILLS }, (_, i) => {
                  const id = p.skills?.[i],
                    known = id ? skill(id) : undefined;
                  return (
                    <button
                      key={i}
                      disabled={busy}
                      aria-pressed={slot === i}
                      aria-label={`Ячейка ${i + 1}: ${known?.name ?? "Пусто"}`}
                      onClick={() => setSlot(i)}
                    >
                      <Text as="span" className="slot-art">
                        {id ? (
                          <SkillIcon id={id} size="100%" framed />
                        ) : (
                          <ItemIcon size="100%" framed />
                        )}
                      </Text>
                      <Text as="small">
                        {i + 1} · {known?.name ?? "Пусто"}
                      </Text>
                    </button>
                  );
                })}
              </div>
              {replacement && (
                <Text as="p" className="accent">
                  Будет заменён навык «{skill(replacement)?.name}».
                </Text>
              )}
              {duplicate && (
                <Text as="p" className="accent">
                  Этот навык уже изучен. Выберите другую награду.
                </Text>
              )}
            </div>
          ) : (
            equipment && (
              <>
                <section className="soul-requirements">
                  <header>
                    <Text as="h3">Требования предмета</Text>
                    <SoulBalance amount={souls} />
                  </header>
                  <CharacterStats
                    fighter={p}
                    souls={souls}
                    busy={busy}
                    onUpgrade={onSpend}
                    requirements={equipment.requirements}
                  />
                </section>
                <ItemInspection
                  equipment={equipment}
                  player={p}
                  source="Награда"
                />
                {displaced(p, equipment).length > 0 && (
                  <Text as="p" className="accent">
                    При принятии будет снято:{" "}
                    {displaced(p, equipment)
                      .map((i) => i.name)
                      .join(", ")}
                    .
                  </Text>
                )}
              </>
            )
          )}
        </RewardWindow>
      )}
    </>
  );
}
