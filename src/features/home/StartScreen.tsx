import { useSavedHeroes, type HeroLoader } from "../characters/useSavedHeroes";
import type { StoragePort } from "../characters/characters";
import "./start-screen.css";

export function StartScreen({
  load,
  onContinue,
  onCreate,
  onHeroes,
  storage,
}: {
  load: HeroLoader;
  onContinue: (id: string) => void;
  onCreate: () => void;
  onHeroes: () => void;
  storage?: StoragePort;
}) {
  const { entries, loading, retry } = useSavedHeroes(load, storage);
  const latest = entries.find((entry) => entry.game);
  const failed = entries.some((entry) => entry.error);
  return (
    <main className="start-screen" aria-label="Главное меню">
      <img
        className="start-landscape"
        src="/ui/start-landscape-v1.png"
        alt=""
        fetchPriority="high"
      />
      <div className="start-content">
        <header>
          <h1>
            <span>Герои</span> Орвеска
          </h1>
          <div className="start-divider" aria-hidden="true">
            <span>◆</span>
          </div>
        </header>
        <nav className="start-menu" aria-label="Начать приключение">
          {!loading && latest && (
            <button
              aria-label="Продолжить"
              onClick={() => onContinue(latest.id)}
            >
              Продолжить
            </button>
          )}
          <button aria-label="Новая игра" onClick={onCreate}>
            Новая игра
          </button>
          <button aria-label="Герои" onClick={onHeroes}>
            Герои
          </button>
        </nav>
        <div className="start-status" aria-live="polite">
          {loading ? (
            <span>Проверяем сохранения…</span>
          ) : failed ? (
            <>
              <span>Не все сохранения удалось открыть.</span>
              <button onClick={retry}>Повторить</button>
            </>
          ) : latest ? (
            <span>Последняя история · {latest.game!.player.name}</span>
          ) : null}
        </div>
      </div>
      <p className="start-footer">Каждый шаг оставляет след</p>
    </main>
  );
}
