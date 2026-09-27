import { Text } from "@/shared/ui/Text";
import "@/features/characters/SoulBalance/SoulBalance.css";

import { SOUL_ICON } from "@/features/characters/SoulBalance/model";
export function SoulBalance({ amount }: { amount: number }) {
  return (
    <Text
      as="span"
      font="display"
      className="soul-balance"
      aria-label={`Осколки: ${amount}`}
    >
      <Text as="b">{amount}</Text>
      <img src={SOUL_ICON} alt="" />
    </Text>
  );
}
