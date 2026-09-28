extends RefCounted
## Keep debug entry points gated independently of their UI visibility.
const Flags = preload("res://game/feature_flags.gd")

static func win(session) -> String:
	if not Flags.enabled(Flags.DEBUG_TOOLS): return "Отладка отключена."
	if session.game.is_empty() or session.game.phase != "combat": return "Сейчас нет активного боя."
	session.game.enemy.hp = 0
	session.game.phase = "victory"
	session.game.erase("clashPlan")
	return session.finish_battle()

static func go_to_map(session, number: String) -> String:
	if not Flags.enabled(Flags.DEBUG_TOOLS): return "Отладка отключена."
	if session.game.is_empty(): return "Сначала выберите героя."
	var value = number.strip_edges()
	if not value.is_valid_int() or value.to_int() < 1 or value.to_int() > session.data.story.chapters.size():
		return "Введите целый номер главы от 1 до %d." % session.data.story.chapters.size()
	session.game.story.pendingEntry = ""
	session.game.story.scene = ""
	session.new_journey(value.to_int())
	# The destination starts before its first fight; no cards/reveal from the old one.
	for key in ["deck", "actionsFinished", "charmsUsed", "exhausted", "battleMode"]:
		session.game.player.erase(key)
	session.game.round = 1
	session.game.log = []
	session.game.erase("lastReactor")
	return session.campaign.seek(session.data.story.scenes[session.campaign.chapter(value.to_int()).introScene].entry)
