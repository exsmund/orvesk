import React from "react";

import { Swords } from "lucide-react";

export function Mark() {
  return (
    <div className="brand">
      <Swords size={27} />
      <span>
        ГЕРОИ ОРВЕСКА<small>ПОШАГОВЫЕ ПОЕДИНКИ</small>
      </span>
    </div>
  );
}
