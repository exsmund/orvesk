import "../../shared/ui/modal-sizes.css";
import { Modal } from "../../shared/ui/Modal";
import { ModalFooter } from "../../shared/ui/ModalFooter";
import { GothicTextButton } from "../../shared/ui/GothicTextButton";
import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { CharacterStats } from "../characters/CharacterStats";
import { SOUL_ICON, SoulBalance } from "../characters/SoulBalance";
import { soulWord } from "../characters/soul-word";
import { SkillCard } from "../skills/SkillUI";
import { SkillIcon } from "../skills/SkillIcon";
import { skillArtwork } from "../skills/skill-artwork";
import { ItemArtwork } from "../equipment/EquipmentDoll";
import { ItemInspection } from "../equipment/ItemInspection";
import { item } from "../../game/equipment/catalog";
import { canUse, displaced } from "../../game/combat/engine";
import { selectedReward } from "../../game/combat/tactics";
import type { PublicGame, Reward } from "../../game/types";
import type { Stat } from "../../game/types";
import { skill, MAX_SKILLS } from "../../game/skills/skills";
import "./reward-dialog.css";

function RewardWindow({
  title,
  cancel,
  footer,
  hint,
  children,
}: {
  title: string;
  cancel?: () => void;
  footer?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Modal
      title={title}
      close={cancel}
      showClose={false}
      closeOnBackdrop={false}
      portal
      className="reward-window"
      size="large"
    >
      <div className="reward-window-scroll">{children}</div>
      <ModalFooter hint={hint}>{footer}</ModalFooter>
    </Modal>
  );
}
const rewardName = (r: Reward) =>
  r.kind === "souls"
    ? `${r.amount} ${soulWord(r.amount)}`
    : r.kind === "item"
      ? item(r.itemId).name
      : `Навык: ${skill(r.skillId)?.name}`;
function RewardArt({ reward }: { reward: Reward }) {
  return reward.kind === "item" ? (
    <ItemArtwork equipment={item(reward.itemId)} size={160} />
  ) : reward.kind === "skill" ? (
    <SkillIcon id={reward.skillId} />
  ) : (
    <img className="soul-reward-art" src={SOUL_ICON} alt="" />
  );
}
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
                <b className="soul-reward-amount">{option.amount}</b>
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
                className="secondary"
                disabled={busy}
                onClick={cancel}
              >
                Отмена
              </GothicTextButton>
              <GothicTextButton
                className="primary"
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
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {reward.kind === "souls" ? (
            <div className="soul-reward-detail">
              <div className="soul-reward-change">
                <SoulBalance amount={souls} />
                <span>→</span>
                <SoulBalance amount={souls + reward.amount} />
              </div>
              <p>
                +<SoulBalance amount={reward.amount} />
              </p>
              <small>
                Тратьте вне боя. При поражении непотраченные души теряются.
              </small>
            </div>
          ) : reward.kind === "skill" ? (
            <div className="skill-reward-detail">
              <img
                className="reward-skill-art"
                src={skillArtwork(reward.skillId)}
                alt=""
              />
              <SkillCard id={reward.skillId} fighter={p} />
              <h3>Выберите ячейку навыка</h3>
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
                      <span className="slot-art">
                        {id ? <SkillIcon id={id} /> : <Plus />}
                      </span>
                      <small>
                        {i + 1} · {known?.name ?? "Пусто"}
                      </small>
                    </button>
                  );
                })}
              </div>
              {replacement && (
                <p className="accent">
                  Будет заменён навык «{skill(replacement)?.name}».
                </p>
              )}
              {duplicate && (
                <p className="accent">
                  Этот навык уже изучен. Выберите другую награду.
                </p>
              )}
            </div>
          ) : (
            equipment && (
              <>
                <section className="soul-requirements">
                  <header>
                    <h3>Требования предмета</h3>
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
                  <p className="accent">
                    При принятии будет снято:{" "}
                    {displaced(p, equipment)
                      .map((i) => i.name)
                      .join(", ")}
                    .
                  </p>
                )}
              </>
            )
          )}
        </RewardWindow>
      )}
    </>
  );
}
