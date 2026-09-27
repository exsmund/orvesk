extends "res://ui/character_page.gd"
const Frame = preload("res://ui/texture_frame.gd")
const Shards = preload("res://ui/shard_counter.gd")
const ResourceBar = preload("res://ui/resource_bar.gd")
var portrait: TextureRect
var frame = Frame.new()
var hero_name: Label
var level: Label
var shards = Shards.new()
var health = ResourceBar.new()
var stamina = ResourceBar.new()
var divider = preload("res://ui/textured_divider.gd").new()

func configure(owner_ui):
	setup(owner_ui)
	portrait = picture(host.data.portrait(host.session.game.player))
	canvas.add_child(frame)
	frame.configure(host.data, 22, "/ui/portrait-frame-v1.png")
	frame.modulate = host.data.color("text-home")
	canvas.add_child(divider)
	divider.configure(host.data)
	hero_name = label("", 30, true)
	level = label("", 19, true)
	level.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	canvas.add_child(shards)
	shards.alignment = HORIZONTAL_ALIGNMENT_RIGHT
	canvas.add_child(health)
	canvas.add_child(stamina)
	refresh()

func refresh():
	var player = host.session.game.player
	hero_name.text = player.name
	level.text = "Уровень %d" % host.data.level(player)
	shards.configure(host.data, int(host.session.game.souls))
	var forecast = host.combat_view.forecast if is_instance_valid(host.combat_view) else {}
	var summary = forecast.get("calculation", {}).get("player", {})
	var available = forecast.get("cost", {}).get("remaining", player.stamina)
	health.configure(host.data, "Здоровье", player.hp, host.data.max_hp(player), "health", host.animated, -summary.get("damage", 0))
	stamina.configure(host.data, "Выносливость", available, host.data.balance.stamina.max, "stamina", host.animated, -summary.get("staminaLoss", 0))
	for bar in [health, stamina]:
		bar.caption_row.add_theme_constant_override("separation", 7)
		bar.label.add_theme_font_size_override("font_size", 18)
		bar.value_label.add_theme_font_size_override("font_size", 18)
		bar.value_label.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
		bar.icon.custom_minimum_size = Vector2(20, 20)
		bar.track.custom_minimum_size.y = 17
	arrange()

func layout_content():
	if not portrait: return
	if wide:
		fit_portrait(Rect2(20, 6, 250, 304))
		put(hero_name, 298, 10, 400, 54)
		put(level, 310, 72, 206, 40)
		put(shards, 516, 72, 170, 40)
		put(divider, 300, 136, 398, divider.THICKNESS)
		put(health, 322, 168, 350, 50)
		put(stamina, 322, 232, 350, 50)
	else:
		fit_portrait(Rect2(42, 2, 276, 314))
		put(hero_name, 8, 322, 344, 44)
		put(level, 20, 368, 200, 40)
		put(shards, 220, 368, 120, 40)
		put(divider, 8, 429, 344, divider.THICKNESS)
		put(health, 20, 447, 320, 46)
		put(stamina, 20, 506, 320, 46)
	fit_label(hero_name, 30, 14)

func fit_portrait(area: Rect2):
	var inset = 16.0
	var texture_size = Vector2(portrait.texture.get_size())
	var available = area.size - Vector2.ONE * inset * 2
	var factor = minf(available.x / texture_size.x, available.y / texture_size.y)
	portrait.size = texture_size * factor
	portrait.position = area.get_center() - portrait.size / 2
	frame.position = portrait.position - Vector2.ONE * inset
	frame.size = portrait.size + Vector2.ONE * inset * 2
