import { formatDamage } from "../../game/combat/battle-feedback";
import "./battle-effects.css";

export function FloatingDamage({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <span className="floating-damage" aria-hidden="true">
      −{formatDamage(amount)}
      <small>ЗДОРОВЬЕ</small>
    </span>
  );
}
