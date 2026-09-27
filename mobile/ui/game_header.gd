extends Control
const ResourceBar = preload("res://ui/resource_bar.gd")
signal player_requested
signal enemy_requested
signal menu_requested
var data
var player_portrait = TextureButton.new()
var enemy_portrait = TextureButton.new()
var mode_icon = TextureButton.new()
var player_bars = VBoxContainer.new()
var enemy_bars = VBoxContainer.new()
var bars: Array = []
var shards = preload("res://ui/shard_counter.gd").new()
var journey_mode = false
var portrait_frame: Texture2D
var frames: Array[TextureRect] = []
var shadow = ColorRect.new()
var shading = ShaderMaterial.new()

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shadow)
	shadow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	shading.shader = preload("res://shaders/header_shadow.gdshader")
	shadow.material = shading
	for node in [player_portrait, player_bars, mode_icon, enemy_bars, enemy_portrait, shards]: add_child(node)
	shards.hide()
	for _i in 2:
		var frame = TextureRect.new()
		frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
		frame.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		frame.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		var material = ShaderMaterial.new()
		material.shader = preload("res://shaders/portrait_frame.gdshader")
		frame.material = material
		add_child(frame)
		frames.append(frame)
	for portrait in [player_portrait, enemy_portrait]:
		portrait.ignore_texture_size = true
		portrait.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_COVERED
		var mask = ShaderMaterial.new()
		mask.shader = preload("res://shaders/portrait_mask.gdshader")
		portrait.material = mask
	mode_icon.ignore_texture_size = true
	mode_icon.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
	player_portrait.pressed.connect(func(): player_requested.emit())
	enemy_portrait.pressed.connect(func(): enemy_requested.emit())
	mode_icon.pressed.connect(func(): menu_requested.emit())
	for parent in [player_bars, enemy_bars]:
		parent.mouse_filter = Control.MOUSE_FILTER_IGNORE
		parent.add_theme_constant_override("separation", 5)
		for _kind in 2:
			var bar = ResourceBar.new()
			parent.add_child(bar)
			bar.make_compact()
			bars.append(bar)
	resized.connect(layout)

func configure(catalog, game: Dictionary, animated: bool, forecast: Dictionary = {}):
	data = catalog
	journey_mode = false
	shards.hide()
	enemy_bars.show()
	enemy_portrait.show()
	portrait_frame = preload("res://ui/gothic_theme.gd").trim_texture(data.image("/ui/portrait-frame-round-v1.png"))
	for frame in frames: frame.texture = portrait_frame
	shading.set_shader_parameter("shade", data.color("base-black"))
	player_portrait.texture_normal = data.portrait(game.player)
	enemy_portrait.texture_normal = data.portrait(game.enemy)
	player_portrait.tooltip_text = game.player.name
	enemy_portrait.tooltip_text = game.enemy.name
	mode_icon.texture_normal = data.image("/ui/battle-modes/%s-v1.png" % game.journey.battleMode)
	mode_icon.tooltip_text = ("Свободное поле" if game.journey.battleMode == "free" else "Единственный шанс") + " · Меню боя"
	for side in 2:
		var f = game.player if side == 0 else game.enemy
		var summary = forecast.get("calculation", {}).get("player" if side == 0 else "enemy", {})
		var available = forecast.get("cost", {}).get("remaining", f.stamina) if side == 0 else summary.get("available", f.stamina)
		bars[side * 2].configure(data, "", f.hp, data.max_hp(f), "health", animated, -summary.get("damage", 0.0))
		bars[side * 2 + 1].configure(data, "", available, data.balance.stamina.max, "stamina", animated, -summary.get("staminaLoss", 0.0))
	layout()

func configure_journey(catalog, game: Dictionary, animated: bool):
	configure(catalog, game, animated)
	journey_mode = true
	enemy_bars.hide()
	enemy_portrait.hide()
	shards.show()
	shards.configure(data, int(game.souls))
	mode_icon.tooltip_text = "Меню путешествия"
	layout()

func layout():
	if size.x < 1 or size.y < 12: return
	var portrait_size = minf(66, size.y - 12)
	var icon_size = minf(38, size.y - 12)
	var gap = 7.0
	var lane = maxf(0, (size.x - portrait_size * 2 - icon_size - gap * 4) / 2)
	player_portrait.position = Vector2(0, (size.y - portrait_size) / 2)
	player_portrait.size = Vector2.ONE * portrait_size
	player_bars.position = Vector2(portrait_size + gap, (size.y - 68) / 2)
	player_bars.size = Vector2(lane, 68)
	mode_icon.position = Vector2((size.x - icon_size) / 2, (size.y - icon_size) / 2)
	mode_icon.size = Vector2.ONE * icon_size
	enemy_bars.position = Vector2(mode_icon.position.x + icon_size + gap, (size.y - 68) / 2)
	enemy_bars.size = Vector2(lane, 68)
	enemy_portrait.position = Vector2(size.x - portrait_size, (size.y - portrait_size) / 2)
	enemy_portrait.size = Vector2.ONE * portrait_size
	shards.position = Vector2(mode_icon.position.x + icon_size + gap, 0)
	shards.size = Vector2(maxf(0, size.x - shards.position.x - 4), size.y)
	for i in 2:
		var portrait = player_portrait if i == 0 else enemy_portrait
		portrait.material.set_shader_parameter("mask_size", portrait.size)
		frames[i].visible = portrait.visible
		frames[i].position = portrait.position - Vector2.ONE * 5
		frames[i].size = portrait.size + Vector2.ONE * 10
	shadow.position = Vector2(-24, -18)
	shadow.size = size + Vector2(48, 60)
	shading.set_shader_parameter("panel_size", shadow.size)
	shading.set_shader_parameter("left_center", player_bars.position + player_bars.size / 2 - shadow.position)
	shading.set_shader_parameter("right_center", enemy_bars.position + enemy_bars.size / 2 - shadow.position)
	shading.set_shader_parameter("lane_size", Vector2(lane * 0.82 + 12, 66))
	shading.set_shader_parameter("show_right", not journey_mode)
	queue_redraw()

func _draw():
	if not data: return
	var color = Color(data.color("border-style-7-2"), 0.6)
	var y = size.y + 17
	draw_line(Vector2(0, y), Vector2(size.x * 0.20, y), color, 1)
	draw_line(Vector2(size.x * 0.80, y), Vector2(size.x, y), color, 1)
