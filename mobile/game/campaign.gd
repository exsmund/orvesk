extends RefCounted
## Generic persistent graph runner. Content, bindings and numeric tuning live in data.
var controller_ref: WeakRef
var session:
	get: return controller_ref.get_ref()
var config: Dictionary

func _init(controller):
	controller_ref = weakref(controller)
	config = session.data.story

static func matches(condition, values: Dictionary) -> bool:
	if condition == null or condition.is_empty(): return true
	var op = condition.keys()[0]
	var args = condition[op]
	match op:
		"all": return args.all(func(c): return matches(c, values))
		"not": return not matches(args, values)
		"eq": return values.get(args[0]) == args[1]
		"gt": return values.get(args[0], 0) != null and values[args[0]] > args[1]
		"gte": return values.get(args[0], 0) != null and values[args[0]] >= args[1]
	push_error("Неизвестное условие сюжета: " + str(op))
	return false

func initial() -> Dictionary:
	var values = {}
	for key in config.state: values[key] = config.state[key].initial
	return {"version": config.version, "campaignId": config.id, "revision": config.revision,
		"node": "", "scene": "", "state": values, "entryState": {}, "pendingEntry": "",
		"completedScenes": [], "decisions": {}, "completedEvents": {}, "claimedStoryRewards": {},
		"encounterVariants": {}, "battleVisits": {}, "attempt": 0, "replaying": false, "dialogue": {"context": "", "entries": []}}

func run() -> Dictionary:
	return session.game.story

func validate_saved(saved: Dictionary) -> String:
	if saved.get("campaignId", "") != config.id or saved.get("node", "") not in config.nodes:
		return "Неизвестное состояние сценария."
	for key in ["state", "entryState", "decisions", "completedEvents", "claimedStoryRewards", "encounterVariants", "battleVisits"]:
		if not saved.get(key) is Dictionary: return "Повреждено сюжетное сохранение: " + key
	if not saved.get("completedScenes") is Array or not saved.get("pendingEntry") is String:
		return "Повреждён маршрут сценария."
	if saved.pendingEntry and saved.pendingEntry not in config.nodes: return "Неизвестный переход сценария."
	if not saved.get("dialogue") is Dictionary or not saved.dialogue.get("entries") is Array or not saved.dialogue.get("context") is String:
		return "Повреждена история диалога."
	for entry in saved.dialogue.entries:
		if not entry is Dictionary: return "Повреждена реплика диалога."
		for field in ["id", "name", "text"]:
			if not entry.get(field) is String: return "Повреждена реплика диалога."
	for key in config.state:
		if not saved.state.has(key): return "В сохранении отсутствует сюжетное поле: " + key
		var value = saved.state[key]
		var definition = config.state[key]
		if value == null and definition.initial == null: continue
		match definition.type:
			"enum":
				if value not in definition.values: return "Неизвестное значение сюжетного поля: " + key
			"boolean":
				if not value is bool: return "Повреждено сюжетное поле: " + key
			"integer", "number":
				if not (value is int or value is float) or not is_finite(float(value)): return "Повреждено числовое поле: " + key
			"string":
				if not value is String: return "Повреждено текстовое поле: " + key
	return ""

func values() -> Dictionary:
	var result: Dictionary = run().state.duplicate(true)
	var voice = config.rules.voice
	var deposits = float(result.get(voice.depositField, 0))
	result.voiceCapability = "silent" if deposits < voice.fragmentaryFrom else ("fragmentary" if deposits < voice.coherentFrom else "coherent")
	result.fillLevel = "high" if voice.initialFill + deposits >= voice.largeFillFrom else "low"
	result.currentChapter = session.game.journey.expedition
	return result

func chapter(number: int) -> Dictionary:
	for entry in config.chapters:
		if int(entry.number) == number: return entry
	return {}

func stage_for_fight(number: int) -> Dictionary:
	for stage in chapter(session.game.journey.expedition).stages:
		if stage.kind != "stop" and int(stage.engineBinding.journeyStage) == number: return config.stages[stage.id]
	return {}

func node() -> Dictionary:
	return config.nodes.get(run().node, {})

func options() -> Array:
	return node().get("options", []).filter(func(id): return matches(config.nodes[id].get("when"), values()))

func display_text() -> String:
	var current = node()
	for variant in current.get("textVariants", []):
		if matches(variant.get("when"), values()): return variant.text
	return current.get("text", "")

func effect_token(id: String, scene: String) -> String:
	return str(run().attempt) + "/" + id if scene == config.nodes[config.defeat.entry].scene else id

func apply_effects(current: Dictionary):
	var token = effect_token(current.id, current.scene)
	if run().completedEvents.has(token): return
	var before = values()
	for effect in current.get("effects", []):
		if matches(effect.get("when"), before): run().state[effect.key] = effect.value
	run().completedEvents[token] = true

func record_dialogue():
	var context = "%s/%s" % [run().scene, run().attempt]
	if session.game.get("skipStory", false) or session.game.phase not in ["story", "ended"]:
		run().dialogue = {"context": "", "entries": []}
		return
	if run().get("dialogue", {}).get("context", "") != context:
		run().dialogue = {"context": context, "entries": []}
	var current = node()
	var text = display_text()
	if current.kind == "choice" or text.is_empty(): return
	var entries: Array = run().dialogue.entries
	if not entries.is_empty() and entries.back().id == current.id: return
	var name = ""
	if current.get("speaker", ""):
		name = current.get("speakerName", session.data.speaker(current.speaker, session.game.player).name)
	entries.append({"id": current.id, "name": name, "text": text})
	merge_answer_echoes()

func merge_answer_echoes():
	var entries: Array = run().get("dialogue", {}).get("entries", [])
	for index in range(entries.size() - 1, 0, -1):
		var answer: Dictionary = entries[index - 1]
		var reply: Dictionary = entries[index]
		var option: Dictionary = config.nodes.get(answer.id, {})
		# Merge only an option and its own spoken response, never repeated dialogue.
		if option.get("kind") == "option" and option.get("next") == reply.id and answer.name == reply.name and answer.text == reply.text:
			reply["optionId"] = answer.id
			entries.remove_at(index - 1)

func seek(target: String, enter_from_map: bool = false) -> String:
	var error = seek_node(target, enter_from_map)
	if not error: record_dialogue()
	return error

func seek_node(target: String, enter_from_map: bool = false) -> String:
	var visited: Array = []
	while not target.is_empty():
		if target == "$chapterStart":
			session.reset_chapter()
			run().scene = ""
			target = config.defeat.chapterStartByNumber[str(int(session.game.journey.expedition))]
		if target not in config.nodes: return "В сценарии нет перехода: " + target
		if target in visited: return "В сценарии найден цикл без окна: " + target
		visited.append(target)
		var current: Dictionary = config.nodes[target]
		var scene: Dictionary = config.scenes[current.scene]
		var stage: Dictionary = config.stages.get(current.scene, {})
		var entering = run().scene != current.scene
		if entering:
			# A map click owns entry into the next combat scene; text never starts it invisibly.
			if not enter_from_map and not stage.is_empty() and stage.kind != "stop":
				run().pendingEntry = target
				session.game.phase = "ready"
				return ""
			var old = run().scene
			if old and old != config.nodes[config.defeat.entry].scene and old not in run().completedScenes:
				run().completedScenes.append(old)
			var number = int(scene.get("chapter") if scene.get("chapter") != null else session.game.journey.expedition)
			if number != int(session.game.journey.expedition): session.new_journey(number)
			run().scene = current.scene
			run().entryState = values()
			run().pendingEntry = ""
			run().replaying = current.scene in run().completedScenes or run().battleVisits.has(current.scene)
			if run().replaying and scene.has("repeatEntry"):
				target = scene.repeatEntry
				continue
		var context: Dictionary = run().entryState if current.get("conditionScope", "") == "entry" else values()
		var enabled = matches(current.get("when"), context)
		# No voice before the hero actually deposits shards. No portrait/name leaks either.
		if current.get("speaker", "") == config.rules.voice.speakerId and values().voiceCapability == "silent": enabled = false
		if not enabled:
			target = current.get("next", "")
			continue
		run().node = target
		match current.kind:
			"effect":
				apply_effects(current)
				if offer_story_reward(current): return ""
				target = current.next
			"combat":
				var error = prepare_enemy(stage)
				if error: return error
				session.game.journey.stage = int(stage.engineBinding.journeyStage)
				session.game.journey.awaitingFirstBattle = false
				session.game.enemy = session.game.journey.enemies[stage.engineBinding.nodeIds[0]].duplicate(true)
				run().battleVisits[current.scene] = true
				session.combat.begin(session.game)
				return ""
			"battleReward":
				session.game.phase = "victory"
				return ""
			"end":
				session.game.phase = "ended"
				session.record_completion()
				return ""
			"choice":
				if current.mode == "activity":
					session.game.phase = "ready"
					return ""
				session.game.phase = "story"
				return ""
			_:
				if session.game.get("skipStory", false):
					apply_effects(current)
					if offer_story_reward(current): return ""
					target = current.next
					continue
				session.game.phase = "story"
				return ""
	return "Пустой переход сценария."

func advance(expected: String, option_id: String = "") -> String:
	if session.game.phase != "story" or run().node != expected: return "Окно уже изменилось."
	var current = node()
	var target: String = str(current.next) if current.get("next") != null else ""
	if current.kind == "choice":
		if option_id not in options(): return "Выберите доступный ответ."
		if current.mode == "single" and run().decisions.has(current.id) and run().decisions[current.id] != option_id: return "Решение уже принято."
		if not session.game.get("skipStory", false): run().dialogue.entries.append({"id": option_id, "name": session.game.player.name, "text": config.nodes[option_id].text})
		run().decisions[current.id] = option_id
		target = config.nodes[option_id].next
		apply_effects(config.nodes[option_id])
	apply_effects(current)
	if offer_story_reward(current): return ""
	return seek(target)

func prepare_enemy(stage: Dictionary) -> String:
	var key: String = stage.engineBinding.nodeIds[0]
	var journey = session.game.journey
	if journey.enemies.has(key): return ""
	var encounter: Dictionary = stage.encounter
	if encounter.has("variants"):
		var variants: Array = encounter.variants.filter(func(v): return matches(v.when, values()))
		if variants.size() != 1: return "Для сюжетной встречи требуется ровно один выбранный вариант: " + stage.id
		encounter = variants[0]
	if run().encounterVariants.has(stage.id): encounter = run().encounterVariants[stage.id]
	else: run().encounterVariants[stage.id] = encounter.duplicate(true)
	var saved_rng = session.combat.rng.state
	session.combat.rng.seed = int(journey.enemySeeds[key])
	journey.enemies[key] = session.generate_enemy(int(stage.engineBinding.journeyStage), encounter)
	session.combat.rng.state = saved_rng
	return "" if not journey.enemies[key].is_empty() else "Не удалось создать сюжетную встречу: " + stage.id

func prune_removed_activities():
	# Keep visited landmarks as history until retry; never reroll a saved map.
	var journey = session.game.journey
	var removed = {}
	for point in journey.map.nodes:
		if point.kind == "fight" or point.id in journey.path: continue
		var stage: Dictionary = config.stages.get(point.get("storyStage", ""), {})
		if stage.has("activityOptions") and not stage.activityOptions.has(point.get("storyOption", "")):
			removed[point.id] = true
	if removed.is_empty(): return
	journey.map.nodes = journey.map.nodes.filter(func(point): return point.id not in removed)
	journey.map.edges = journey.map.edges.filter(func(edge): return edge[0] not in removed and edge[1] not in removed)

func available_nodes() -> Array:
	if session.game.phase != "ready" or session.game.journey.has("service"): return []
	if run().pendingEntry:
		var sid: String = config.nodes[run().pendingEntry].scene
		return config.stages[sid].engineBinding.nodeIds
	var current = node()
	if current.get("kind") == "choice" and current.mode == "activity":
		return session.game.journey.map.nodes.filter(func(n): return n.get("storyOption", "") in options()).map(func(n): return n.id)
	return []

func travel(id: String) -> String:
	if id not in available_nodes(): return "Этот путь недоступен."
	var point = session.data.lookup(session.game.journey.map.nodes, id)
	if session.current_node() != id: session.game.journey.path.append(id)
	if point.kind == "fight":
		return seek(run().pendingEntry, true)
	var option_id: String = point.storyOption
	var option: Dictionary = config.nodes[option_id]
	var activity: Dictionary = config.rules.activities[point.mapPointType]
	run().decisions[str(run().attempt) + "/" + node().id] = option_id
	if activity.handler == "recover":
		session.game.player.hp = minf(session.data.max_hp(session.game.player), session.game.player.hp + session.data.max_hp(session.game.player) * activity.healthFraction)
		session.game.player.stamina = minf(session.data.max_stamina(session.game.player), session.game.player.stamina + session.data.max_stamina(session.game.player) * activity.staminaFraction)
	elif activity.handler == "equipment":
		var offers = equipment_offers(int(activity.offers))
		var prices = {}
		for reference in offers:
			var item = session.data.item(reference)
			prices[reference] = int(activity.price.base + item.level * activity.price.perLevel + item.tier * activity.price.perTier)
		session.game.journey.service = {"id": id, "type": point.mapPointType, "next": option.next, "prices": prices}
		session.game.journey.offers = offers
		session.game.journey.forgeResolved = false
		return ""
	return seek(option.next)

func equipment_offers(count: int) -> Array:
	var pool: Array = []
	for template in session.data.items:
		if template.get("unarmed", false) or template.tier > session.data.stat_total(session.game.player) + config.rules.serviceEquipment.maximumTierOffsetFromStatTotal: continue
		var rank = 999 if not template.requirements.is_empty() else 1
		for stat in template.requirements: rank = mini(rank, session.data.effective_stat(session.game.player, stat))
		var item = session.data.item("%s@%d" % [template.id, rank])
		if session.data.can_use(session.game.player, item) and item.id not in session.game.player.gear.values(): pool.append(item.id)
	return session.combat.shuffled(pool).slice(0, count)

func finish_service(reference: String) -> String:
	var journey = session.game.journey
	if session.game.phase != "ready" or not journey.has("service"): return "Услуга недоступна."
	var service: Dictionary = journey.service
	if reference:
		if reference not in journey.offers: return "Предложение изменилось."
		if session.data.item(reference).get("unarmed", false): return "Предмет недоступен."
		var cost = int(service.prices[reference])
		if session.game.souls < cost: return "Недостаточно осколков."
		if not session.data.wear(session.game.player, session.data.item(reference)): return "Предмет недоступен."
		session.game.souls -= cost
	journey.erase("service")
	journey.forgeResolved = true
	return seek(service.next)

func offer_story_reward(current: Dictionary) -> bool:
	var id: String = current.get("rewardId", "")
	if id.is_empty() or run().claimedStoryRewards.has(id): return false
	var reward = session.data.lookup(config.rules.storyRewards, id)
	var amount = ceili((session.data.level(session.game.player) + 2) * reward.get("upgradeCostFactor", 0))
	var offers: Array = []
	if reward.kind == "equipment": offers = equipment_offers(int(reward.offers)).map(func(ref): return {"kind":"item", "itemId":ref})
	run().claimedStoryRewards[id] = true
	session.game.souls += amount
	session.game.rewardOptions = offers
	session.game.victoryReward = {"shards": amount, "recoveredShards": 0, "title": reward.title}
	run().rewardNext = current.next
	session.game.phase = "victory"
	return true

func after_victory() -> String:
	var current = node()
	return seek(current.replayNext if run().replaying else current.next, true)

func after_reward() -> String:
	var target: String = run().get("rewardNext", node().get("next", ""))
	run().erase("rewardNext")
	session.game.erase("victoryReward")
	return seek(target)

func start_defeat() -> String:
	run().attempt += 1
	var context = values()
	var variants: Array = config.defeat.variants.filter(func(v): return matches(v.when, context))
	var other = variants.filter(func(v): return v.id != context.get("lastDeathVariant"))
	if not other.is_empty(): variants = other
	if matches(config.defeat.randomWhen, context) and not variants.is_empty():
		var selected = session.sample(variants)
		run().state.deathVariant = selected.id
		run().state.lastDeathVariant = selected.id
	return seek(config.defeat.entry, true)
