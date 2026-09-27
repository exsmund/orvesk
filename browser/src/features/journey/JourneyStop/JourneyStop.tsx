import { Text } from "@/shared/ui/Text";
import "@/features/journey/JourneyStop/JourneyStop.css";
import { EquipmentIcon } from "@/shared/ui/EquipmentIcon/EquipmentIcon";
import { ModalFooter } from "@/shared/ui/ModalFooter/ModalFooter";

import { useState } from "react";
import { canUse, displaced, maxHp } from "@/game/combat/engine";
import { item } from "@/game/equipment/catalog";
import { currentJourneyNode, journeyNode } from "@/game/journey/journey-map";
import type { PublicGame } from "@/game/types";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";

export function JourneyStop({
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
  const [forge, setForge] = useState(""),
    j = game.journey;
  if (!j) return null;
  const current = currentJourneyNode(j),
    node = journeyNode(current, j),
    atForge = node?.kind === "forge" && !j.forgeResolved,
    removed = forge ? displaced(game.player, item(forge)) : [];
  return (
    <>
      {" "}
      {node?.kind === "camp" && (
        <div className="journey-stop" role="status">
          <Text as="h4">Отдых у костра</Text>
          <Text as="p">
            Здоровье восстановлено: {game.player.hp}/{maxHp(game.player)}.
            Выберите следующего противника на карте.
          </Text>
        </div>
      )}
      {node?.kind === "forge" && (
        <>
          <div className="forge-content journey-node-details">
            {atForge ? (
              <>
                <div
                  className="reward-gallery"
                  role="group"
                  aria-label="Предметы кузницы"
                >
                  {j.offers?.map((id) => (
                    <button
                      type="button"
                      className="reward-tile"
                      key={id}
                      aria-label={item(id).name}
                      aria-pressed={forge === id}
                      disabled={busy}
                      onClick={() => setForge(id)}
                    >
                      <EquipmentIcon equipment={item(id)} framed size={160} />
                    </button>
                  ))}
                </div>
                {forge && (
                  <>
                    {!canUse(game.player, item(forge)) && (
                      <Text as="p" className="accent">
                        Не выполнены требования предмета.
                      </Text>
                    )}
                    <GothicTextButton
                      variant="secondary"
                      onClick={() => onInspect(forge)}
                    >
                      Свойства предмета
                    </GothicTextButton>
                    {removed.length > 0 && (
                      <div
                        className="forge-removed"
                        role="group"
                        aria-label="Предметы, которые будут потеряны"
                      >
                        <Text as="p" className="forge-removed-label">
                          Вы теряете:
                        </Text>
                        {removed.map((equipment) => (
                          <div
                            className="forge-removed-item"
                            key={equipment.id}
                            role="img"
                            aria-label={`Будет потерян: ${equipment.name}`}
                            title={`Будет потерян: ${equipment.name}`}
                          >
                            <EquipmentIcon
                              equipment={equipment}
                              framed
                              size={96}
                            />
                            <svg viewBox="0 0 100 100" aria-hidden="true">
                              <path d="M8 8 92 92 M92 8 8 92" />
                            </svg>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <Text as="p" role="status">
                Кузница пройдена. Выберите следующего противника на карте.
              </Text>
            )}
          </div>
          {atForge && (
            <ModalFooter hint="Вы можете взять один предмет или не брать ничего">
              <GothicTextButton
                variant="secondary"
                disabled={busy}
                onClick={() => onNext({ forge: true, fromNode: current })}
              >
                Ничего не брать
              </GothicTextButton>
              <GothicTextButton
                variant="primary"
                disabled={
                  busy ||
                  !forge ||
                  !j.offers?.includes(forge) ||
                  !canUse(game.player, item(forge))
                }
                onClick={() =>
                  onNext({ forge: true, fromNode: current, itemId: forge })
                }
              >
                {removed.length ? "Заменить предмет" : "Взять предмет"}
              </GothicTextButton>
            </ModalFooter>
          )}
        </>
      )}
    </>
  );
}
