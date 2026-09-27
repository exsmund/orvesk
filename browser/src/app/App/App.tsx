import { Text } from "@/shared/ui/Text";
import "@/app/App/App.css";

import { CharacterCreation } from "@/features/characters/CharacterCreation/CharacterCreation";
import { CharacterHome } from "@/features/characters/CharacterHome/CharacterHome";
import { HERO_LIMIT_MESSAGE } from "@/features/characters/characters";
import { StartScreen } from "@/features/home/StartScreen/StartScreen";
import { GothicTextButton } from "@/shared/ui/GothicTextButton/GothicTextButton";
import { Modal } from "@/shared/ui/Modal/Modal";
import { ModalFooter } from "@/shared/ui/ModalFooter/ModalFooter";
import { useKeyboardInputFocus } from "@/shared/ui/useKeyboardInputFocus";

import { GameScreen } from "@/features/combat/GameScreen/GameScreen";
import { useGameSession } from "@/features/session/useGameSession";
import { request } from "@/shared/api/client";
import { Mark } from "@/shared/ui/Mark/Mark";

export function App() {
  useKeyboardInputFocus();
  const {
    heroLimitOpen,
    setHeroLimitOpen,
    screen,
    setScreen,
    game,
    session,
    loading,
    busy,
    error,
    setError,
    goHome,
    openCharacter,
    newCharacter,
    create,
    deleteCharacter,
    sendAction,
  } = useGameSession();
  const heroLimitDialog = heroLimitOpen && (
    <Modal
      title="Слишком много героев"
      close={() => setHeroLimitOpen(false)}
      size="small"
      className="hero-confirm-dialog"
    >
      <div className="hero-confirm-body">
        <Text as="p">{HERO_LIMIT_MESSAGE}</Text>
      </div>
      <ModalFooter>
        <GothicTextButton
          onClick={() => {
            setHeroLimitOpen(false);
            setScreen("heroes");
          }}
        >
          К героям
        </GothicTextButton>
      </ModalFooter>
    </Modal>
  );
  if (screen === "home")
    return (
      <>
        <StartScreen
          load={request}
          onContinue={openCharacter}
          onCreate={newCharacter}
          onHeroes={() => setScreen("heroes")}
        />
        {heroLimitDialog}
      </>
    );
  if (screen === "heroes")
    return (
      <>
        <CharacterHome
          onDelete={deleteCharacter}
          onOpen={openCharacter}
          onCreate={newCharacter}
          onBack={goHome}
          load={request}
        />
        {heroLimitDialog}
      </>
    );
  if (loading && screen === "game")
    return (
      <div className="loading">
        <Mark />
        <Text as="p">Открываем ворота арены…</Text>
      </div>
    );
  if (screen === "game" && !game && session)
    return (
      <div className="loading">
        <Mark />
        <Text as="p" role="alert">
          {error || "Не удалось открыть сохранение."}
        </Text>
        <button className="primary" onClick={() => location.reload()}>
          <Text>Повторить загрузку</Text>
        </button>
        <button className="secondary" onClick={goHome}>
          <Text>На главный экран</Text>
        </button>
      </div>
    );
  if (!game)
    return (
      <CharacterCreation
        onClose={goHome}
        onCreate={(draft) => void create(draft)}
        busy={busy}
        error={error}
      />
    );

  return (
    <GameScreen
      key={session}
      game={game}
      session={session ?? ""}
      busy={busy}
      error={error}
      setError={setError}
      sendAction={sendAction}
      goHome={goHome}
    />
  );
}
