import { Text } from "@/shared/ui/Text";
import "@/features/journey/JourneyNodeIcon/JourneyNodeIcon.css";
import { Check } from "lucide-react";
import type { JourneyNode } from "@/game/journey/journey-map";
import { SoulBalance } from "@/features/characters/SoulBalance/SoulBalance";

/** Map node presentation; navigation and availability are owned by JourneyMap. */
export function JourneyNodeIcon({
  node,
  current = false,
  visited = false,
  past = false,
  available = false,
  busy = false,
  status,
  label,
  lostSouls,
  onClick,
}: {
  node: JourneyNode;
  current?: boolean;
  visited?: boolean;
  past?: boolean;
  available?: boolean;
  busy?: boolean;
  status: string;
  label?: string;
  lostSouls?: number;
  onClick?: () => void;
}) {
  const artwork =
    node.kind === "fight"
      ? node.stage === 5
        ? "champion"
        : "battle"
      : node.kind;
  return (
    <button
      type="button"
      className={`journey-node ${node.kind} ${current ? "current" : ""} ${visited ? "visited" : ""} ${past ? "past" : ""} ${available ? "available" : ""}`}
      style={{ left: `${node.x}%`, top: `${node.y}%` }}
      disabled={busy}
      data-unavailable={!available || busy}
      aria-current={current ? "location" : undefined}
      aria-haspopup={available ? "dialog" : undefined}
      aria-label={`${node.name}${node.kind === "fight" ? ` · этап ${node.stage}` : ""} · ${status}`}
      title={`${node.name} · ${status}`}
      onClick={onClick}
    >
      {!!lostSouls && (
        <Text
          as="span"
          className="journey-lost-souls"
          style={node.x > 50 ? { left: "auto", right: "100%" } : undefined}
          title="Потерянные осколки"
        >
          <SoulBalance amount={lostSouls} />
        </Text>
      )}
      {label && (
        <Text as="span" className="journey-battle-label">
          {label}
        </Text>
      )}
      <img src={`/ui/journey/${artwork}-v1.png`} alt="" draggable={false} />
      {visited && !current && (
        <Check className="journey-node-check" size={12} aria-hidden="true" />
      )}
    </button>
  );
}
