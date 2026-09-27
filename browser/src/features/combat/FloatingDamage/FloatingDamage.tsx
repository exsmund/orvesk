import { Text } from "@/shared/ui/Text";
import "@/features/combat/FloatingDamage/FloatingDamage.css";
import { formatDamage } from "@/game/combat/battle-feedback";

export function FloatingDamage({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <Text as="span" className="floating-damage" aria-hidden="true">
      −{formatDamage(amount)}
      <Text as="small">ЗДОРОВЬЕ</Text>
    </Text>
  );
}
