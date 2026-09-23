import "./gothic-controls.css";
const images = {
  menu: "menu-v1",
  left: "left-v1",
  right: "right-v2",
  close: "close-v2",
  minus: "minus-v1",
  plus: "plus-v1",
  grave: "grave-v1",
} as const;
export function GothicIcon({ icon }: { icon: keyof typeof images }) {
  return (
    <img
      className="gothic-control-art"
      src={`/ui/navigation/${images[icon]}.png`}
      alt=""
      draggable={false}
    />
  );
}
