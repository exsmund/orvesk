import "@/shared/ui/GothicIcon/GothicIcon.css";

import { images } from "@/shared/ui/GothicIcon/model";
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
