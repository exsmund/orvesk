import "./souls.css";
export const SOUL_ICON = "/ui/soul-wisp-v1.png";

export function SoulBalance({ amount }: { amount: number }) {
  return (
    <span className="soul-balance" aria-label={`Души: ${amount}`}>
      <b>{amount}</b>
      <img src={SOUL_ICON} alt="" />
    </span>
  );
}
