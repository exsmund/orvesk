import { Text } from "@/shared/ui/Text";
import "@/features/home/StartScreen/StartScreen.css";
import type { StoragePort } from "@/features/characters/characters";
import {
  useSavedHeroes,
  type HeroLoader,
} from "@/features/characters/useSavedHeroes";

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
          <Text as="h1" color="home">
            <Text as="span">Герои</Text> Орвеска
          </Text>
          <div className="start-divider" aria-hidden="true">
            <Text as="span">◆</Text>
          </div>
        </header>
        <nav className="start-menu" aria-label="Начать приключение">
          {!loading && latest && (
            <button
              aria-label="Продолжить"
              onClick={() => onContinue(latest.id)}
            >
              <Text>Продолжить</Text>
            </button>
          )}
          <button aria-label="Новая игра" onClick={onCreate}>
            <Text>Новая игра</Text>
          </button>
          <button aria-label="Герои" onClick={onHeroes}>
            <Text>Герои</Text>
          </button>
        </nav>
        <div className="start-status" aria-live="polite">
          {loading ? (
            <Text as="span">Проверяем сохранения…</Text>
          ) : failed ? (
            <>
              <Text as="span">Не все сохранения удалось открыть.</Text>
              <button onClick={retry}>
                <Text>Повторить</Text>
              </button>
            </>
          ) : latest ? (
            <Text as="span">
              Последняя история · {latest.game!.player.name}
            </Text>
          ) : null}
        </div>
      </div>
      <Text as="p" className="start-footer">
        Каждый шаг оставляет след
      </Text>
    </main>
  );
}
