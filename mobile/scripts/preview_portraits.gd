extends SceneTree
## Isolated, interactive UI previews. Progress and preferences stay in memory.
const MODES = {
	"creation":"Создание героя", "hero":"Карточка героя", "heroes":"Список героев",
	"creatures":"Список существ", "creature-card":"Карточка существа",
	"enemy-human":"Карточка противника-человека", "enemy-creature":"Карточка противника-существа",
	"combat":"Бой", "map":"Карта", "dialogue-hero":"Реплика героя",
	"dialogue-character":"Реплика персонажа", "dialogue-creature":"Реплика существа",
	"victory":"Победа", "defeat":"Поражение", "forge":"Кузница"
}
var ui

class MemorySaves extends RefCounted:
	var error = ""
	var records: Dictionary = {}
	func write(id, session, draft):
		records[id] = {"game":session.game.duplicate(true), "draft":draft.duplicate(true), "rngState":str(session.combat.rng.state)}
		return true
	func read(id): return records.get(id, {}).duplicate(true)
	func list_heroes(): return records.keys().map(func(id): return {"id":id, "payload":records[id].duplicate(true)})
	func remove(id): records.erase(id); return true

func _initialize(): call_deferred("run")

func settle():
	for _i in 10: await process_frame

func open_mode(mode: String):
	if is_instance_valid(ui):
		ui.hero_id = ""
		ui.queue_free()
		await process_frame
	ui = load("res://scenes/main.tscn").instantiate()
	ui.session = preload("res://tests/campaign_driver.gd").new(ui.data)
	ui.saves = MemorySaves.new()
	ui.preferences = preload("res://tests/inspection.gd").MemoryPreferences.new()
	root.add_child(ui)
	await settle()
	var s = ui.session
	s.combat.rng.seed = 61
	s.create("Искатель", {"strength":3,"agility":2,"vitality":1,"intelligence":1}, ui.data.portraits[0].id)
	ui.hero_id = "portrait-preview"
	ui.saves.write(ui.hero_id, s, {})
	match mode:
		"creation": ui.start_create(); ui.create_portrait = 0; ui.creation_view.identity.refresh()
		"hero": ui.show_game(); ui.show_character()
		"heroes": ui.show_heroes()
		"creatures": ui.show_debug_catalog(true)
		"creature-card": ui.show_debug_catalog(true); ui.show_catalog_entry("wolf", true)
		"dialogue-hero", "dialogue-character", "dialogue-creature":
			for node in ui.data.story.nodes.values():
				if node.kind != "dialogue" or not node.get("speaker", ""): continue
				var binding = ui.data.story.speakers[node.speaker]
				var person = ui.data.lookup(ui.data.characters, binding.get("characterId", ""))
				var source = "hero" if person.get("portraitSource", "") == "player" else ("character" if not person.is_empty() else "creature")
				if mode != "dialogue-" + source: continue
				s.game.phase = "story"
				s.game.story.scene = node.scene
				s.game.story.node = node.id
				s.campaign.record_dialogue()
				break
			ui.show_game()
		"forge":
			var point = {}
			for seed_value in range(1, 15):
				s.combat.rng.seed = seed_value
				s.map_fixture(1)
				for node in s.game.journey.map.nodes:
					if node.kind == "forge": point = node; break
				if not point.is_empty(): break
			if not point.is_empty():
				s.service_fixture(point, ui.data.items.filter(func(item): return not item.get("unarmed", false)).slice(0,3).map(func(item): return item.id))
			ui.show_game()
		"enemy-human", "enemy-creature", "combat", "victory", "defeat":
			s.fight_fixture(1)
			var enemy = s.fighter("Противник", s.game.player.stats.duplicate(true), ui.data.portraits[1].id)
			if mode != "enemy-human":
				var species = ui.data.lookup(ui.data.creatures, "wolf")
				enemy.name = species.name
				enemy.creatureId = species.id
			s.game.enemy = enemy
			s.combat.begin(s.game)
			if mode in ["victory", "defeat"]:
				s.game.souls = 23
				if mode == "victory": s.game.enemy.hp = 0
				else: s.game.player.hp = 0
				s.game.phase = mode
				s.finish_battle()
			ui.show_game()
			if mode.begins_with("enemy-"): ui.show_enemy_details()
		_: ui.show_game()
	await settle()
	root.title = "Орвеск — " + MODES[mode] + " (превью)"
	Engine.max_fps = 20

func run():
	var args = OS.get_cmdline_user_args()
	var mode = args[0] if not args.is_empty() else "creation"
	if mode not in MODES:
		printerr("Preview modes: " + ", ".join(MODES.keys()))
		quit(1)
		return
	await open_mode(mode)
	print("PORTRAIT_PREVIEW_READY: " + mode)
