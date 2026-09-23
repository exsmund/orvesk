import "../features/combat/mobile-combat-header.css";
import { useKeyboardInputFocus } from "../shared/ui/useKeyboardInputFocus";

import { ModalFooter } from "../shared/ui/ModalFooter";

import { GothicTextButton } from "../shared/ui/GothicTextButton";
import { CharacterCreation } from "../features/characters/CharacterCreation";
import { StartScreen } from "../features/home/StartScreen";

import { Modal } from "../shared/ui/Modal";

import React from "react";

import { CharacterHome } from "../features/characters/CharacterHome";
import { HERO_LIMIT_MESSAGE } from "../features/characters/characters";

import "./styles/style.css";
import "../features/characters/portraits.css";
import "../features/combat/combat-layout.css";
import "../features/combat/tactics.css";
import "../features/characters/fighter-portraits.css";
import "./styles/ui-textures.css";
import { Mark } from "../shared/ui/BrandMark";
import { request } from "../shared/api/client";
import { useGameSession } from "../features/session/useGameSession";
import { GameScreen } from "../features/combat/GameScreen";
import "./styles/responsive.css";
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
        <p>{HERO_LIMIT_MESSAGE}</p>
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
        <p>Открываем ворота арены…</p>
      </div>
    );
  if (screen === "game" && !game && session)
    return (
      <div className="loading">
        <Mark />
        <p role="alert">{error || "Не удалось открыть сохранение."}</p>
        <button className="primary" onClick={() => location.reload()}>
          Повторить загрузку
        </button>
        <button className="secondary" onClick={goHome}>
          На главный экран
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
