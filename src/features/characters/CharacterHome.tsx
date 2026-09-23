import { CharacterPortrait } from "../../shared/ui/CharacterPortrait";
import { GothicIcon } from "../../shared/ui/GothicIcon";
import { useState } from "react";
import { ModalFooter } from "../../shared/ui/ModalFooter";
import { GothicTextButton } from "../../shared/ui/GothicTextButton";
import { Plus, RotateCcw, Swords } from "lucide-react";
import type { StoragePort } from "./characters";
import { portrait } from "../../game/characters/portraits";
import { level } from "../../game/progression/souls";
import { SoulBalance } from "./SoulBalance";
import { Modal } from "../../shared/ui/Modal";
import { useSavedHeroes, type HeroLoader } from "./useSavedHeroes";
import "./characters.css";
import "../home/start-screen.css";
import "./heroes-dialog.css";
const phaseLabel = {
  combat: "Поединок продолжается",
  victory: "Ожидает награда",
  ready: "В пути",
  defeat: "После поражения",
  draw: "После ничьей",
};
export function CharacterHome({
  onOpen,
  onCreate,
  onBack,
  onDelete,
  load,
  storage,
}: {
  onOpen: (id: string) => void;
  onCreate: () => void;
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
  load: HeroLoader;
  storage?: StoragePort;
}) {
  const { entries, loading, retry } = useSavedHeroes(load, storage);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const closeDelete = () => {
    if (!busy) {
      setDeleting(null);
      setError("");
    }
  };
  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    setError("");
    try {
      await onDelete(deleting.id);
      setDeleting(null);
      retry();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="heroes-screen heroes-modal-backdrop">
      <img
        className="start-landscape"
        src="/ui/start-landscape-v1.png"
        alt=""
      />
      <Modal
        title="Герои"
        close={onBack}
        className="heroes-dialog"
        size="small"
      >
        <div className="heroes-dialog-body">
          {loading && <p role="status">Открываем летопись…</p>}
          {!loading && !entries.length && (
            <section className="heroes-empty">
              <Swords size={32} />
              <h2>Ваша история ещё не началась</h2>
              <p>Создайте героя и отправьтесь к арене.</p>
            </section>
          )}
          <div className="heroes-roster">
            {entries.map((e) => (
              <article className="hero-roster-entry" key={e.id}>
                {e.game ? (
                  <button
                    className="hero-select"
                    onClick={() => onOpen(e.id)}
                    aria-label={`Продолжить приключение: ${e.game.player.name}`}
                  >
                    <CharacterPortrait
                      className="roster-portrait-frame"
                      src={portrait(e.game.player.portraitId).src}
                      loading="lazy"
                    />
                    <div>
                      <h2>{e.game.player.name}</h2>
                      <span className="eyebrow">
                        УРОВЕНЬ {level(e.game.player)}
                      </span>
                      <p>{phaseLabel[e.game.phase]}</p>
                      <SoulBalance amount={e.game.souls} />
                    </div>
                  </button>
                ) : e.error ? (
                  <div className="hero-load-error">
                    <h2>{e.name ?? "Герой"}</h2>
                    <p role="alert">{e.error}</p>
                    <button className="secondary" onClick={retry}>
                      <RotateCcw size={16} />
                      Повторить
                    </button>
                  </div>
                ) : (
                  <p className="muted">Загрузка…</p>
                )}
                <button
                  className="gothic-button hero-delete"
                  aria-label={`Удалить героя: ${e.game?.player.name ?? e.name ?? "Герой"}`}
                  onClick={() => {
                    setError("");
                    setDeleting({
                      id: e.id,
                      name: e.game?.player.name ?? e.name ?? "Герой",
                    });
                  }}
                >
                  <GothicIcon icon="grave" />
                </button>
              </article>
            ))}
          </div>
        </div>
        <ModalFooter>
          <GothicTextButton className="primary" onClick={onCreate}>
            <Plus size={16} />
            Новая игра
          </GothicTextButton>
        </ModalFooter>
      </Modal>
      {deleting && (
        <Modal
          title="Удалить героя?"
          close={closeDelete}
          size="small"
          className="hero-confirm-dialog"
        >
          <div className="hero-confirm-body">
            <p>
              Удалить героя «{deleting.name}»? Весь его прогресс будет потерян.
              Отменить удаление нельзя.
            </p>
            {error && <p role="alert">{error}</p>}
          </div>
          <ModalFooter>
            <GothicTextButton onClick={closeDelete} disabled={busy} autoFocus>
              Отмена
            </GothicTextButton>
            <GothicTextButton
              onClick={() => void confirmDelete()}
              disabled={busy}
            >
              {busy ? "Удаление…" : "Удалить героя"}
            </GothicTextButton>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
