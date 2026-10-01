extends "res://ui/character_page.gd"
const Shards = preload("res://ui/shard_counter.gd")
var portrait = preload("res://ui/portrait_art.gd").new()
var hero_name: Label
var level: Label
var shards = Shards.new()
var resources = preload("res://ui/resource_stack.gd").new()
var health = resources.health
var stamina = resources.stamina
var divider = preload("res://ui/textured_divider.gd").new()

func configure(owner_ui):
	setup(owner_ui)
	canvas.add_child(portrait)
	portrait.configure(host.data, host.data.portrait(host.session.game.player))
	canvas.add_child(divider)
	divider.configure(host.data)
	hero_name = label("", 30, true)
	level = label("", 19, true)
	level.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	canvas.add_child(shards)
	shards.alignment = HORIZONTAL_ALIGNMENT_RIGHT
	canvas.add_child(resources)
	refresh()

func refresh():
	var player = host.session.game.player
	hero_name.text = player.name
	level.text = "Уровень %d" % host.data.level(player)
	shards.configure(host.data, int(host.session.game.souls))
	var forecast = host.combat_view.forecast if is_instance_valid(host.combat_view) else {}
	var summary = forecast.get("calculation", {}).get("player", {})
	var available = forecast.get("cost", {}).get("remaining", player.stamina)
	health.configure(host.data, "Здоровье", player.hp, host.data.max_hp(player), "health", -summary.get("damage", 0))
	stamina.configure(host.data, "Выносливость", available, host.data.max_stamina(player), "stamina", -summary.get("staminaLoss", 0))
	arrange()

func layout_content():
	if not portrait: return
	if wide:
		portrait.fit_in(Rect2(0, 6, 294, 304))
		put(hero_name, 298, 10, 400, 54)
		put(level, 310, 72, 206, 40)
		put(shards, 516, 72, 170, 40)
		put(divider, 300, 136, 398, divider.THICKNESS)
		put(resources, 322, 168, 350, resources.HEIGHT)
	else:
		portrait.fit_in(Rect2(0, 2, 360, 314))
		put(hero_name, 8, 322, 344, 44)
		put(level, 20, 368, 200, 40)
		put(shards, 220, 368, 120, 40)
		put(divider, 8, 429, 344, divider.THICKNESS)
		put(resources, 20, 447, 320, resources.HEIGHT)
	fit_label(hero_name, 30, 14)
