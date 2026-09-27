import "@/features/rewards/VictoryRewardDialog/RewardArt.css";

import { item } from "@/game/equipment/catalog";
import type { Reward } from "@/game/types";
import { EquipmentIcon } from "@/shared/ui/EquipmentIcon/EquipmentIcon";
import { ItemIcon } from "@/shared/ui/ItemIcon/ItemIcon";
import { SkillIcon } from "@/shared/ui/SkillIcon/SkillIcon";
import { SOUL_ICON } from "@/features/characters/SoulBalance/model";

export function RewardArt({ reward }: { reward: Reward }) {
  return reward.kind === "item" ? (
    <EquipmentIcon equipment={item(reward.itemId)} framed size={160} />
  ) : reward.kind === "skill" ? (
    <SkillIcon id={reward.skillId} size={160} framed />
  ) : (
    <ItemIcon size={160} framed>
      <img className="soul-reward-art" src={SOUL_ICON} alt="" />
    </ItemIcon>
  );
}
