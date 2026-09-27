import { Text } from "@/shared/ui/Text";
import "@/shared/ui/Mark/Mark.css";
import { Swords } from "lucide-react";
export function Mark() {
  return (
    <div className="brand">
      <Swords size={27} />
      <Text as="span">
        ГЕРОИ ОРВЕСКА<Text as="small">ПОШАГОВЫЕ ПОЕДИНКИ</Text>
      </Text>
    </div>
  );
}
