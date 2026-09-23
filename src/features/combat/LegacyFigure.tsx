import React from "react";

import { item } from "../../game/equipment/catalog";
import { weapon } from "../../game/combat/engine";
import { type Fighter } from "../../game/types";

export function Figure({
  fighter,
  enemy = false,
  large = false,
}: {
  fighter: Fighter;
  enemy?: boolean;
  large?: boolean;
}) {
  const w = weapon(fighter),
    armed = w.id !== "fist";
  return (
    <svg
      className={`figure ${enemy ? "enemy-figure" : ""} ${large ? "large" : ""} ${fighter.hp <= 0 ? "fallen" : ""}`}
      viewBox="0 0 240 340"
      role="img"
      aria-label={`${fighter.name}: человек без пола, ${armed ? w.name : "без оружия"}, ${fighter.gear.body ? item(fighter.gear.body).name : "без одежды"}`}
    >
      <defs>
        <linearGradient id={enemy ? "skin-e" : "skin-p"} x1="0" x2="1">
          <stop stopColor={enemy ? "#716158" : "#8c918a"} />
          <stop offset=".5" stopColor={enemy ? "#d3aa8f" : "#d8d9cb"} />
          <stop offset="1" stopColor={enemy ? "#877365" : "#767d77"} />
        </linearGradient>
      </defs>
      <ellipse cx="117" cy="319" rx="79" ry="12" fill="#000" opacity=".25" />
      <g
        fill={`url(#${enemy ? "skin-e" : "skin-p"})`}
        stroke={enemy ? "#534a42" : "#575e57"}
        strokeWidth="1.3"
        strokeLinejoin="round"
      >
        <path d="m96 194 22 4-12 55-18 54-18 8-6-7 13-11 8-54z" />
        <path d="m120 193 21-5 7 60 22 54 13 8-4 7-26-6-26-57z" />
        <path d="m93 100 22-8 26 9 12 36-17 33 6 31-28 11-24-17 6-26-14-39z" />
        <path d="m88 106 13 15-25 43-27 13-9-9 28-19z" />
        <path d="m137 106 15 4 17 41 30-10 7 10-40 21-14-10-18-36z" />
        <path d="m105 84 19-1 6 20-24 3z" />
        <path d="m97 56 11-14 18 0 12 15-3 27-13 12-15-4-10-17z" />
      </g>
      <path
        d="m104 68 26-1m-14 0 1 14m-19 49 13 8 24-10m-21 11-1 26m-17 5 17 6 23-8"
        fill="none"
        stroke="#30352f"
        opacity=".25"
      />
      {fighter.gear.body && (
        <path
          d="m93 100 22 6 26-5 9 39-16 27 7 31-28 12-25-16 8-30-12-25z"
          fill="#505b55"
          stroke="#a6aa90"
          strokeWidth="2"
        />
      )}
      {fighter.gear.feet && (
        <g fill="#464940" stroke="#a6aa90">
          <path d="m76 283 18 5-6 19-18 8-6-7 13-11z" />
          <path d="m153 285 12-5 5 22 13 8-4 7-26-6z" />
        </g>
      )}
      {armed && (
        <g transform="rotate(20 202 144)">
          <path
            d={`M199 148 199 ${w.hands === 2 ? 13 : w.range! > 120 ? 38 : 75} 204 ${w.hands === 2 ? 3 : w.range! > 120 ? 28 : 65} 208 ${w.hands === 2 ? 13 : w.range! > 120 ? 38 : 75} 205 148Z`}
            fill="#babdb0"
            stroke="#e0d5b8"
          />
          <path d="M189 149h25m-12 0v25" stroke="#bda47c" strokeWidth="5" />
        </g>
      )}
      {fighter.gear.shield && (
        <path
          d="M27 139 66 139 71 165 47 202 22 168Z"
          fill="#444d47"
          stroke="#afa88a"
          strokeWidth="3"
        />
      )}
      <path d="M96 58 105 48" stroke="#fff" opacity=".25" strokeWidth="2" />
    </svg>
  );
}
