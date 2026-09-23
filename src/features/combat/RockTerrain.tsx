import { useId } from "react";
import { rockRegions } from "../../game/combat/terrain";
import "./rock-terrain.css";

/** A shared terrain layer spans the gaps; interactive cells stay above it. */
export function RockTerrain({
  blocked,
  unlocked = [],
}: {
  blocked: readonly number[];
  unlocked?: readonly (number | undefined)[];
}) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="rock-terrain" aria-hidden="true">
      {rockRegions(blocked, unlocked).map((r, i) => {
        const clip = `rock-${id}-${i}`;
        return (
          <svg
            key={r.cells.join("-")}
            className="rock-region"
            data-rock-cells={r.cells.join(",")}
            style={{
              gridColumn: `${r.x + 1} / span ${r.width}`,
              gridRow: `${r.y + 1} / span ${r.height}`,
            }}
            viewBox={`0 0 ${r.width * 100} ${r.height * 100}`}
            preserveAspectRatio="none"
          >
            <defs>
              <clipPath id={clip}>
                {r.cells.map((n) => (
                  <rect
                    key={n}
                    x={((n % 3) - r.x) * 100}
                    y={(Math.floor(n / 3) - r.y) * 100}
                    width="100"
                    height="100"
                  />
                ))}
              </clipPath>
            </defs>
            <image
              href={`/terrain/${r.texture}`}
              width={r.width * 100}
              height={r.height * 100}
              preserveAspectRatio="none"
              clipPath={`url(#${clip})`}
            />
          </svg>
        );
      })}
    </div>
  );
}
