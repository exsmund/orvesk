extends Control
## Shared map/combat/result header. Layout changes never rebuild game state.
const ResourceBar = preload("res://ui/resource_bar.gd")
const GothicTheme = preload("res://ui/gothic_theme.gd")
const FittedLabel = preload("res://ui/fitted_label.gd")
const HEIGHT = preload("res://ui/adaptive_layout.gd").HEADER_HEIGHT
const NUMBER_SIZE = 14
const TITLE_SIZE = 22
signal player_requested
signal enemy_requested
signal menu_requested
var data
var player_portrait = TextureButton.new()
var enemy_portrait = TextureButton.new()
var mode_icon = TextureButton.new()
var map_number = FittedLabel.new()
var title = FittedLabel.new()
var title_override = ""
var player_bars = VBoxContainer.new()
var enemy_bars = VBoxContainer.new()
var bars: Array = []
var shards = preload("res://ui/shard_counter.gd").new()
var journey_mode = false
var portrait_frame: Texture2D
var frames: Array[TextureRect] = []
var shadow = ColorRect.new()
var shading = ShaderMaterial.new()
var stone = ColorRect.new()
var frame = preload("res://ui/texture_frame.gd").new()
var divider = preload("res://ui/header_divider.gd").new()
var separators: Array = []

func _init():
	set_notify_transform(true)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	add_child(shadow)
	shadow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	shading.shader = preload("res://shaders/header_shadow.gdshader")
	shadow.material = shading
	add_child(stone)
	stone.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stone.material = ShaderMaterial.new()
	stone.material.shader = preload("res://shaders/header_stone.gdshader")
	stone.material.set_shader_parameter("stone", preload("res://content/ui/character-slate-v1.png"))
	add_child(frame)
	frame.texture = preload("res://content/ui/header-frame-v1.png")
	frame.corner = 34
	add_child(divider)
	for _i in 2:
		var separator = preload("res://ui/textured_divider.gd").new()
		add_child(separator)
		separators.append(separator)
	for node in [player_portrait, player_bars, mode_icon, map_number, enemy_bars, enemy_portrait, shards, title]: add_child(node)
	shards.hide()
	shards.font_size = 16
	shards.icon_scale = 1.32
	shards.group_digits = true
	shards.alignment = HORIZONTAL_ALIGNMENT_CENTER
	for label in [title, map_number]:
		label.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.base_font_size = TITLE_SIZE
	map_number.base_font_size = 13
	for _i in 2:
		var border = TextureRect.new()
		border.mouse_filter = Control.MOUSE_FILTER_IGNORE
		border.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		border.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		var material = ShaderMaterial.new()
		material.shader = preload("res://shaders/portrait_frame.gdshader")
		border.material = material
		add_child(border)
		frames.append(border)
	for portrait in [player_portrait, enemy_portrait]:
		portrait.ignore_texture_size = true
		# The mask shader performs cover using the shared source-space crop position.
		portrait.stretch_mode = TextureButton.STRETCH_SCALE
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
		parent.add_theme_constant_override("separation", 7)
		parent.resized.connect(center_resources)
		for _kind in 2:
			var bar = ResourceBar.new()
			parent.add_child(bar)
			bar.make_header()
			bars.append(bar)
	resized.connect(layout)

func configure(catalog, game: Dictionary, animated: bool, forecast: Dictionary = {}, on_map: bool = false):
	data = catalog
	journey_mode = on_map
	shards.visible = journey_mode
	enemy_bars.visible = not journey_mode
	enemy_portrait.visible = not journey_mode
	portrait_frame = GothicTheme.trim_texture(data.image("/ui/portrait-frame-round-v1.png"))
	for border in frames: border.texture = portrait_frame
	for separator in separators: separator.configure(data, true)
	shading.set_shader_parameter("shade", data.color("base-black"))
	player_portrait.texture_normal = data.portrait(game.player)
	enemy_portrait.texture_normal = data.portrait(game.enemy)
	var crop: Dictionary = data.portrait_presentation.circle.position
	for portrait in [player_portrait, enemy_portrait]:
		portrait.material.set_shader_parameter("object_position", Vector2(crop.x, crop.y))
	player_portrait.tooltip_text = game.player.name
	enemy_portrait.tooltip_text = game.enemy.name
	mode_icon.texture_normal = GothicTheme.trim_texture(data.image("/ui/battle-modes/%s-v1.png" % game.journey.battleMode))
	mode_icon.tooltip_text = ("Свободное поле" if game.journey.battleMode == "free" else "Единственный шанс") + (" · Меню путешествия" if journey_mode else " · Меню боя")
	map_number.text = str(int(game.journey.expedition))
	map_number.tooltip_text = "Карта %s" % map_number.text
	for label in [map_number, title]: label.add_theme_color_override("font_color", data.color("text-home"))
	if journey_mode:
		shards.configure(data, int(game.souls))
		title.text = title_override if title_override else data.lookup(data.maps, game.journey.mapPreset).name
	else:
		var plan = game.get("clashPlan", {})
		title.text = "Ход %d · %s" % [game.round, "Раскрытие" if plan.get("stage") == "reveal" else ("Вы ходите первым" if plan.get("preparer") == "player" else "Ваш ответ")]
	for side in (1 if journey_mode else 2):
		var f = game.player if side == 0 else game.enemy
		var summary = forecast.get("calculation" if forecast.get("known", true) else "estimate", {}).get("player" if side == 0 else "enemy", {})
		var available = forecast.get("cost", {}).get("remaining", f.stamina) if side == 0 else summary.get("available", f.stamina)
		var estimate = not forecast.get("known", true)
		bars[side * 2].configure(data, "", f.hp, data.max_hp(f), "health", animated, -summary.get("damage", 0.0), estimate)
		bars[side * 2 + 1].configure(data, "", available, data.balance.stamina.max, "stamina", animated, -summary.get("staminaLoss", 0.0), estimate)
	layout()

func configure_journey(catalog, game: Dictionary, animated: bool):
	configure(catalog, game, animated, {}, true)

func layout():
	if size.x < 1 or size.y < 12: return
	var padding = 16.0
	var top_height = size.y - 38
	var portrait_inset = padding + 3
	var portrait_size = minf(72, minf(top_height - portrait_inset - 6, size.x * 0.16))
	var icon_size = minf(38, size.x * 0.085)
	var mode_width = icon_size + 12
	var gap = 9.0
	var lane = maxf(1, (size.x - padding * 2 - portrait_size * 2 - mode_width - gap * 4) / 2)
	# Equal top/outer-side insets, including the circular frame's four-pixel overhang.
	player_portrait.position = Vector2.ONE * portrait_inset
	player_portrait.size = Vector2.ONE * portrait_size
	player_bars.position.x = padding + portrait_size + gap
	mode_icon.position = Vector2((size.x - icon_size) / 2, top_height / 2 - 22)
	mode_icon.size = Vector2(icon_size, 36)
	map_number.position = Vector2((size.x - mode_width) / 2, mode_icon.position.y + 34)
	map_number.size = Vector2(mode_width, 21)
	enemy_bars.position.x = (size.x + mode_width) / 2 + gap
	enemy_portrait.position = Vector2(size.x - portrait_inset - portrait_size, portrait_inset)
	enemy_portrait.size = Vector2.ONE * portrait_size
	shards.position = Vector2(enemy_bars.position.x + 4, 12)
	shards.size = Vector2(maxf(1, size.x - shards.position.x - padding - 6), top_height - 24)
	for i in 2:
		var portrait = player_portrait if i == 0 else enemy_portrait
		portrait.material.set_shader_parameter("mask_size", portrait.size)
		frames[i].visible = portrait.visible
		frames[i].position = portrait.position - Vector2.ONE * 4
		frames[i].size = portrait.size + Vector2.ONE * 8
		separators[i].position = Vector2((size.x + (-mode_width if i == 0 else mode_width)) / 2, 15)
		separators[i].size = Vector2(1, top_height - 26)
	var font_size = NUMBER_SIZE
	for i in (2 if journey_mode else 4): font_size = mini(font_size, bars[i].fitting_size(lane, NUMBER_SIZE))
	for bar in bars: bar.set_header_font_size(font_size)
	for parent in [player_bars, enemy_bars]: parent.size = Vector2(lane, parent.get_combined_minimum_size().y)
	center_resources()
	map_number.fit()
	divider.position = Vector2(12, top_height - 6)
	divider.size = Vector2(size.x - 24, 12)
	# Prata's visible glyphs sit above its line-box center; lower the line optically.
	title.position = Vector2(18, top_height + 7)
	title.size = Vector2(size.x - 36, size.y - top_height - 11)
	title.fit()
	frame.size = size
	frame.queue_redraw()
	stone.size = size
	stone.material.set_shader_parameter("panel_size", size)
	layout_shadow()
	shards.queue_redraw()

func _notification(what):
	if what == NOTIFICATION_TRANSFORM_CHANGED: layout_shadow()

func layout_shadow():
	if not is_inside_tree(): return
	# Fade to transparent before the viewport edge, including asymmetric safe areas.
	# The header itself never sits in a clipping scroll container.
	var viewport = get_global_transform().affine_inverse() * get_viewport_rect()
	var bounds = Rect2(-24, -24, size.x + 48, size.y + 60).intersection(viewport)
	shadow.position = bounds.position
	shadow.size = bounds.size
	shading.set_shader_parameter("panel_size", shadow.size)
	shading.set_shader_parameter("inset", -shadow.position)
	shading.set_shader_parameter("header_size", size)

func center_resources():
	for parent in [player_bars, enemy_bars]: parent.position.y = (size.y - 38 - parent.size.y) / 2
