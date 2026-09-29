extends SceneTree
const Catalog = preload("res://game/catalog.gd")
const Session = preload("res://tests/campaign_driver.gd")
var checks = 0
var failures: Array = []
func check(value: bool, message: String):
	checks += 1
	if not value: failures.append(message); printerr("FAIL: " + message)
func _initialize():
	var data = Catalog.new()
	var s = Session.new(data)
	s.combat.rng.seed = 319
	check(data.journey_rules.battleModes == ["free"], "Only Free field is configured")
	check(s.create("Проверка", {"strength":2,"agility":2,"vitality":2,"intelligence":1}, data.portraits[0].id).is_empty(), "Create hero")
	for chapter in [1,2,3,6]:
		s.map_fixture(chapter)
		check(s.game.journey.battleMode == "free", "Every chapter uses Free field")
	s.map_fixture(1)
	s.fight_fixture(1)
	s.game.clashPlan.stage = "reveal"
	s.game.clashPlan.playerPlaced = []
	s.game.clashPlan.enemyPlaced = []
	var saved = {"game":s.game.duplicate(true),"rngState":str(s.combat.rng.state)}
	saved.game.journey.battleMode = "expendable"
	for f in [saved.game.player, saved.game.enemy]:
		f.battleMode = "expendable"
		f.actionsFinished = true
	var restored = Session.new(data)
	check(restored.restore(saved).is_empty(), "Restore legacy mode")
	check(restored.game.journey.battleMode == "free", "Legacy journey converted")
	check(str(restored.combat.rng.state) == saved.rngState, "RNG preserved")
	check(restored.game.clashPlan == saved.game.clashPlan, "Committed reveal preserved")
	for side in ["player","enemy"]:
		check(restored.game[side].deck == saved.game[side].deck, "Cards preserved")
		check(restored.game[side].hp == saved.game[side].hp, "Health preserved")
		check(restored.game[side].battleMode == "free" and not restored.game[side].has("actionsFinished"), "Fighter resumes free play")
	var f = restored.game.player
	var card = f.deck.hand[0].duplicate(true)
	f.deck = {"hand":[],"draw":[],"discard":[card],"exchanged":false}
	restored.combat.fill_hand(f)
	check(f.deck.hand == [card] and f.deck.discard.is_empty(), "Discard returns to hand")
	f.deck = {"hand":[card],"draw":[],"discard":[f.deck.hand[0].duplicate(true)],"exchanged":false}
	f.deck.discard[0].id = "replacement"
	restored.game.clashPlan.stage = "preparation"
	check(restored.combat.exchange(restored.game, card.id).is_empty(), "Exchange recycles discard")
	check(f.deck.hand[0].id == "replacement", "Exchanged card drawn")
	print("FREE_MODE: %d checks; %d failures" % [checks, failures.size()])
	quit(0 if failures.is_empty() else 1)
