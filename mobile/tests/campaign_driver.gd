extends "res://game/session.gd"
## UI/combat fixtures use the real campaign transitions, automatically reading
## dialogue. Campaign tests exercise each individual window and choice directly.
func dialogues() -> String:
	for _step in 200:
		if game.phase != "story": return ""
		var current = campaign.node()
		var choices = campaign.options()
		var selected = choices.back() if current.get("mode", "") != "single" and not choices.is_empty() else (choices[0] if not choices.is_empty() else "")
		var error = super.story_advance(current.id, selected)
		if error: return error
	return "Test dialogue did not terminate"

func create(name: String, stats: Dictionary, portrait_id: String) -> String:
	var error = super.create(name, stats, portrait_id)
	return error if error else dialogues()

func travel(id: String) -> String:
	var error = super.travel(id)
	return error if error else dialogues()

func finish_battle() -> String:
	var error = super.finish_battle()
	return error if error else dialogues()

func complete_reward() -> String:
	var error = super.complete_reward()
	return error if error else dialogues()

func restart() -> String:
	var error = super.restart()
	return error if error else dialogues()

func forge(reference: String = "") -> String:
	var error = super.forge(reference)
	return error if error else dialogues()

func map_fixture(number: int):
	game.story.scene = ""
	new_journey(number)
	campaign.seek(data.story.scenes[campaign.chapter(number).introScene].entry)
	dialogues()

func fight_fixture(stage: int):
	var definition = campaign.stage_for_fight(stage)
	game.story.scene = definition.id
	game.story.node = definition.combatNode
	game.story.pendingEntry = ""
	game.story.replaying = false
	game.journey.stage = stage
	game.journey.path = [definition.engineBinding.nodeIds[0]]
	game.journey.awaitingFirstBattle = false
	game.erase("victoryReward")
	campaign.prepare_enemy(definition)
	game.enemy = game.journey.enemies[definition.engineBinding.nodeIds[0]].duplicate(true)
	combat.begin(game)

func service_fixture(point: Dictionary, offers: Array):
	var definition = data.story.stages[point.storyStage]
	game.story.scene = definition.id
	game.story.pendingEntry = ""
	campaign.seek(definition.activityChoice, true)
	travel(point.id)
	game.journey.offers = offers
	for reference in offers: game.journey.service.prices[reference] = 0
