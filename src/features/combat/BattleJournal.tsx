import React from "react";

import { ChevronDown, ChevronRight, Dices } from "lucide-react";

import { type PublicGame } from "../../game/types";

export function BattleJournal({ game }: { game: PublicGame }) {
  const latest = game.log[0];
  return (
    <section className="journal">
      <div className="panel-heading">
        <div>
          <span className="section-index">02</span>
          <h2>Хроника поединка</h2>
        </div>
        <span className="journal-subtitle">КАЖДЫЙ БРОСОК ИМЕЕТ ЗНАЧЕНИЕ</span>
      </div>
      {latest ? (
        <div className="journal-layout">
          <div className="dice-summary">
            <span className="eyebrow">
              ПОСЛЕДНИЙ БРОСОК · ХОД {latest.round}
            </span>
            <div className="dice-pair">
              <div>
                <span
                  className={`die ${latest.playerDie === 20 ? "critical" : ""}`}
                >
                  {latest.playerDie}
                </span>
                <small>ВЫ</small>
              </div>
              <span className="dice-divider">:</span>
              <div>
                <span
                  className={`die enemy-die ${latest.enemyDie === 20 ? "critical" : ""}`}
                >
                  {latest.enemyDie}
                </span>
                <small>ПРОТИВНИК</small>
              </div>
            </div>
            <p>
              {latest.playerAction}
              <span>vs</span>
              {latest.enemyAction}
            </p>
          </div>
          <div className="log-list" aria-live="polite">
            <span className="sr-only">
              Ход {latest.round}. Ваш бросок {latest.playerDie}, противник{" "}
              {latest.enemyDie}.
            </span>
            {latest.events.map((event, idx) => (
              <p key={`${latest.round}-${idx}`}>
                <ChevronRight size={13} />
                {event}
              </p>
            ))}
            {game.log.length > 1 && (
              <details className="past-turns">
                <summary>
                  Предыдущие ходы <ChevronDown size={13} />
                </summary>
                {game.log.slice(1).map((turn) => (
                  <div key={turn.round}>
                    <h4>
                      Ход {turn.round} · {turn.playerDie} : {turn.enemyDie} ·{" "}
                      {turn.playerAction} / {turn.enemyAction}
                    </h4>
                    {turn.events.map((event, idx) => (
                      <p key={idx}>{event}</p>
                    ))}
                  </div>
                ))}
              </details>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-journal">
          <Dices size={27} />
          <div>
            <strong>Тишина перед первым ударом.</strong>
            <p>
              Выберите действие. Здесь появятся броски кубиков и события боя.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
