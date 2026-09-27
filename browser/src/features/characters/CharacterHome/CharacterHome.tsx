import { Text } from "@/shared/ui/Text";
import "@/features/characters/CharacterHome/CharacterHome.css";
import { Plus, RotateCcw, Swords } from "lucide-react";
import { useState } from "react";
import { portrait } from "@/game/characters/portraits";
import { level } from "@/game/progression/souls";
import { CharacterPortrait } from "@/shared/ui/CharacterPortrait/CharacterPortrait";
import { GothicIcon } from "@/shared/ui/GothicIcon/GothicIcon";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { Modal } from "@/shared/ui/Modal/Modal";
import { ModalFooter } from "@/shared/ui/ModalFooter/ModalFooter";
import type { StoragePort } from "@/features/characters/characters";
import { SoulBalance } from "@/features/characters/SoulBalance/SoulBalance";
import {
  useSavedHeroes,
  type HeroLoader,
} from "@/features/characters/useSavedHeroes";

import { phaseLabel } from "@/features/characters/CharacterHome/model";
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
          {loading && (
            <Text as="p" role="status">
              Открываем летопись…
            </Text>
          )}
          {!loading && !entries.length && (
            <section className="heroes-empty">
              <Swords size={32} />
              <Text as="h2">Ваша история ещё не началась</Text>
              <Text as="p">Создайте героя и отправьтесь к арене.</Text>
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
                      <Text as="h2">{e.game.player.name}</Text>
                      <Text as="span" className="eyebrow">
                        УРОВЕНЬ {level(e.game.player)}
                      </Text>
                      <Text as="p">{phaseLabel[e.game.phase]}</Text>
                      <SoulBalance amount={e.game.souls} />
                    </div>
                  </button>
                ) : e.error ? (
                  <div className="hero-load-error">
                    <Text as="h2">{e.name ?? "Герой"}</Text>
                    <Text as="p" role="alert">
                      {e.error}
                    </Text>
                    <button className="secondary" onClick={retry}>
                      <RotateCcw size={16} />
                      <Text>Повторить</Text>
                    </button>
                  </div>
                ) : (
                  <Text as="p" className="muted">
                    Загрузка…
                  </Text>
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
          <GothicTextButton variant="primary" onClick={onCreate}>
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
            <Text as="p">
              Удалить героя «{deleting.name}»? Весь его прогресс будет потерян.
              Отменить удаление нельзя.
            </Text>
            {error && (
              <Text as="p" role="alert">
                {error}
              </Text>
            )}
          </div>
          <ModalFooter>
            <GothicTextButton
              variant="secondary"
              onClick={closeDelete}
              disabled={busy}
              autoFocus
            >
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
