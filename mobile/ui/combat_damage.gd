extends Control
## Transient feedback from one committed clash. Never replayed by rendering/loading.
signal finished
const DURATION = 1.05
const GothicTheme = preload("res://ui/gothic_theme.gd")
var header
var labels: Dictionary = {}
var progress = 0.0
var tween: Tween
var blocks_input = false

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	z_index = 100
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

func configure(view, summary: Dictionary, data, block: bool = false):
	header = view
	blocks_input = block
	mouse_filter = Control.MOUSE_FILTER_STOP if block else Control.MOUSE_FILTER_IGNORE
	for side in ["player", "enemy"]:
		var lost = float(summary.get(side, {}).get("damage", 0))
		if lost <= 0: continue
		var label = Label.new()
		label.text = "−" + str(snappedf(lost, 0.1)).trim_suffix(".0")
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		label.add_theme_font_override("font", GothicTheme.BODY_FONT)
		label.add_theme_font_size_override("font_size", 25)
		label.add_theme_color_override("font_color", data.color("text-danger"))
		label.add_theme_color_override("font_outline_color", data.color("base-black"))
		label.add_theme_constant_override("outline_size", 5)
		add_child(label)
		labels[side] = label
	update_progress(0)
	tween = create_tween()
	tween.tween_method(update_progress, 0.0, 1.0, DURATION)
	tween.tween_callback(func(): finished.emit())

func update_progress(value: float):
	progress = value
	if not is_instance_valid(header): return
	for side in labels:
		var portrait = header.player_portrait if side == "player" else header.enemy_portrait
		var rect = portrait.get_global_rect()
		var label: Label = labels[side]
		var extent = Vector2(maxf(80, label.get_minimum_size().x + 8), 38)
		# Follow the avatar on resize. Rise out of its upper half without leaving the window.
		var start = rect.position.y + rect.size.y * 0.20 - extent.y / 2
		var end = maxf(3, start - 30)
		var rise = 1.0 - pow(1.0 - value, 2)
		label.position = Vector2(clampf(rect.get_center().x - extent.x / 2, 3, maxf(3, size.x - extent.x - 3)), lerpf(start, end, rise)) - global_position
		label.size = extent
		label.modulate.a = smoothstep(0.0, 0.08, value) * (1.0 - smoothstep(0.62, 1.0, value))
