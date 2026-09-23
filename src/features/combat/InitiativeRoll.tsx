import { useEffect, useRef, useState } from "react";
import { Modal } from "../../shared/ui/Modal";
import { useReducedMotion } from "./useReducedMotion";
import type { Side } from "../../game/types";
import "./initiative-roll.css";

interface InitiativeRollProps {
  playerDie: number;
  enemyDie: number;
  playerReaction: number;
  enemyReaction: number;
  playerName: string;
  enemyName: string;
  preparer: Side;
  onComplete: () => void;
}
export function InitiativeRoll({
  playerDie,
  enemyDie,
  playerReaction,
  enemyReaction,
  playerName,
  enemyName,
  preparer,
  onComplete,
}: InitiativeRollProps) {
  const host = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const complete = useRef(onComplete);
  const [phase, setPhase] = useState("rolling");
  const reduced = useReducedMotion();
  useEffect(() => {
    const element = content.current!;
    const dialog = element.closest("dialog")!;
    const fit = () => {
      const availableHeight = Math.max(1, dialog.clientHeight - 24);
      const availableWidth = Math.max(1, dialog.clientWidth - 24);
      const scale = Math.min(
        1,
        availableHeight / Math.max(1, element.offsetHeight),
        availableWidth / Math.max(1, element.offsetWidth),
      );
      element.style.setProperty("--roll-scale", String(scale));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    observer.observe(dialog);
    fit();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    complete.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    let disposed = false;
    let dispose: (() => void) | undefined;
    const roll = reduced ? 150 : 2400;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let started = false;
    const start = () => {
      if (disposed || started) return;
      started = true;
      timers.push(
        setTimeout(() => setPhase("settled"), roll),
        setTimeout(() => setPhase("numbers"), roll + 450),
        setTimeout(() => setPhase("order"), roll + 1350),
        setTimeout(() => setPhase("leaving"), roll + 2950),
        setTimeout(() => complete.current(), roll + 3250),
      );
    };
    // Loading or WebGL failure must never leave the player locked out.
    timers.push(setTimeout(start, 8000));
    void import("./dice-scene")
      .then(({ createDiceScene }) => {
        if (!disposed && !started && host.current) {
          dispose = createDiceScene(
            host.current,
            [playerDie, enemyDie],
            reduced,
          );
        }
      })
      .catch(() => {
        /* The numeric result remains available without WebGL. */
      })
      .finally(start);
    return () => {
      disposed = true;
      dispose?.();
      timers.forEach(clearTimeout);
    };
  }, [playerDie, enemyDie, reduced]);
  const showNumbers = ["numbers", "order", "leaving"].includes(phase);
  return (
    <Modal
      title="Бросок реакции"
      variant="bare"
      className={`initiative-roll initiative-roll-${phase}`}
      closeOnBackdrop={false}
      portal
    >
      <div className="initiative-roll-content" ref={content}>
        <p className="eyebrow">ОЧЕРЁДНОСТЬ ХОДА</p>
        <div className="initiative-roll-scene" ref={host} aria-hidden="true" />
        <div className="initiative-roll-results">
          {[
            [playerName, playerDie, playerReaction],
            [enemyName, enemyDie, enemyReaction],
          ].map(([name, die, reaction], index) => (
            <div key={index}>
              <span>{name}</span>
              <div
                className="initiative-roll-number"
                style={{ visibility: showNumbers ? "visible" : "hidden" }}
              >
                <strong>{die}</strong>
                <small>
                  {" "}
                  + {reaction} реакция = {Number(die) + Number(reaction)}
                </small>
              </div>
            </div>
          ))}
        </div>
        <div className="initiative-roll-order" role="status" aria-live="polite">
          {phase === "order" || phase === "leaving" ? (
            <>
              <h2>
                {preparer === "player"
                  ? "Вы ходите первым"
                  : "Противник ходит первым"}
              </h2>
              <p>
                {preparer === "player"
                  ? "Разместите фигуры. Противник ответит после вас."
                  : "Противник разместил фигуры. Теперь ваш ответ."}
              </p>
            </>
          ) : (
            <p>
              {showNumbers
                ? "К броску прибавляется реакция"
                : "Бросок кубиков…"}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
