extends VBoxContainer
const GothicTheme = preload("res://ui/gothic_theme.gd")
const SHADER = preload("res://shaders/resource_bar.gdshader")
const RIM = preload("res://content/ui/resource-rim-v1.png")
const FILL = preload("res://content/ui/resource-fill-v1.png")
var label = Label.new()
var value_label = Label.new()
var icon = preload("res://ui/resource_symbols.gd").new()
var forecast_label = Label.new()
var caption_row = HBoxContainer.new()
var surface = ColorRect.new()
var shader_material = ShaderMaterial.new()
var animation: Tween
var fraction = 1.0
var initialized = false
var target_fraction = 1.0
var track = PanelContainer.new()
var forecast_surface = Control.new()
var forecast_change = 0.0
var displayed_value = 0.0
var limit = 1.0
var palette
var header_mode = false
var estimated = false

func _init():
	add_child(caption_row)
	caption_row.add_theme_constant_override("separation", 7)
	caption_row.add_child(icon)
	icon.custom_minimum_size = Vector2(20, 20)
	caption_row.add_child(label)
	caption_row.add_child(forecast_label)
	caption_row.add_child(value_label)
	value_label.add_theme_font_size_override("font_size", 18)
	value_label.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	value_label.clip_text = true
	value_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	forecast_label.add_theme_font_size_override("font_size", 13)
	label.add_theme_font_size_override("font_size", 18)
	label.add_theme_font_override("font", GothicTheme.BODY_FONT)
	track.custom_minimum_size.y = 17
	add_child(track)
	track.add_child(surface)
	track.add_child(forecast_surface)
	forecast_surface.mouse_filter = Control.MOUSE_FILTER_IGNORE
	forecast_surface.draw.connect(draw_forecast)
	forecast_surface.resized.connect(forecast_surface.queue_redraw)
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.clip_text = true
	surface.mouse_filter = Control.MOUSE_FILTER_IGNORE
	shader_material.shader = SHADER
	shader_material.set_shader_parameter("rim", RIM)
	shader_material.set_shader_parameter("grain", FILL)
	var region = preload("res://ui/gothic_theme.gd").visible_region(RIM)
	var extent = Vector2(RIM.get_size())
	shader_material.set_shader_parameter("rim_region", Vector4(region.position.x / extent.x, region.position.y / extent.y, region.size.x / extent.x, region.size.y / extent.y))
	surface.material = shader_material
	surface.resized.connect(func(): shader_material.set_shader_parameter("bar_size", surface.size))

func make_compact():
	track.custom_minimum_size.y = 10
	label.add_theme_font_size_override("font_size", 14)
	value_label.add_theme_font_size_override("font_size", 14)
	value_label.add_theme_font_override("font", GothicTheme.BODY_FONT)
	icon.custom_minimum_size = Vector2(14, 14)
	caption_row.add_theme_constant_override("separation", 3)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_theme_constant_override("separation", 2)

func make_header():
	make_compact()
	header_mode = true
	icon.hide()
	caption_row.move_child(value_label, 0)
	value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	forecast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	forecast_label.clip_text = true
	caption_row.add_theme_constant_override("separation", 4)
	track.custom_minimum_size.y = 12
	caption_row.custom_minimum_size.y = 18

func fitting_size(width: float, maximum: int) -> int:
	var font = value_label.get_theme_font("font")
	var fitted = maximum
	var text = value_label.text + ("  " + forecast_label.text if forecast_label.visible else "")
	while fitted > 1 and font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, fitted).x > width: fitted -= 1
	return fitted

func set_header_font_size(value: int):
	for node in [value_label, forecast_label]: node.add_theme_font_size_override("font_size", value)
	forecast_label.custom_minimum_size.x = ceilf(forecast_label.get_theme_font("font").get_string_size(forecast_label.text, HORIZONTAL_ALIGNMENT_LEFT, -1, value).x) if forecast_label.visible else 0

func set_animation(enabled: bool):
	shader_material.set_shader_parameter("animated", enabled)
	if not enabled:
		if animation: animation.kill()
		set_fill(target_fraction)

func set_fill(value: float):
	fraction = value
	shader_material.set_shader_parameter("fill", value)

func configure(data, caption: String, value: float, maximum: float, kind: String, animate: bool, change: float = 0.0, estimate: bool = false):
	palette = data
	estimated = estimate
	displayed_value = value
	limit = maxf(1, maximum)
	forecast_change = change
	icon.configure(kind, data.color("text-danger" if kind == "health" else "text-home"))
	value_label.clip_text = caption.is_empty()
	label.text = caption
	label.visible = not header_mode and not caption.is_empty()
	value_label.size_flags_horizontal = Control.SIZE_SHRINK_END if caption else Control.SIZE_EXPAND_FILL
	value_label.text = "%s / %s" % [number(value), number(maximum)]
	value_label.add_theme_color_override("font_color", data.color("text-home"))
	forecast_label.text = ("−" if change < 0 else "+") + number(absf(change)) if not is_zero_approx(change) else ""
	tooltip_text = "Предварительный урон с учётом брони, до ответа противника." if estimated else ""
	forecast_label.visible = not is_zero_approx(change)
	forecast_label.add_theme_color_override("font_color", data.color("text-danger" if change < 0 and kind == "health" else "text-highlight"))
	label.add_theme_color_override("font_color", data.color("text-home"))
	label.add_theme_color_override("font_outline_color", data.color("background-page"))
	# Reuse the canonical effect colors used by the web ResourceBar.
	shader_material.set_shader_parameter("tint", data.color("effect-resource-health" if kind == "health" else "effect-resource-stamina"))
	shader_material.set_shader_parameter("empty", data.color("background-panel"))
	set_animation(animate)
	var next = clampf(value / limit, 0, 1)
	if not initialized or not animate:
		set_fill(next)
	elif not is_equal_approx(next, target_fraction):
		if animation: animation.kill()
		animation = create_tween()
		animation.tween_method(set_fill, fraction, next, 0.22).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	target_fraction = next
	initialized = true
	track.add_theme_stylebox_override("panel", StyleBoxEmpty.new())
	forecast_surface.queue_redraw()

func number(value: float) -> String:
	return str(snappedf(value, 0.1)).trim_suffix(".0")

func draw_forecast():
	if not palette or is_zero_approx(forecast_change): return
	var current = clampf(displayed_value / limit, 0, 1)
	var predicted = clampf((displayed_value + forecast_change) / limit, 0, 1)
	var inner = Rect2(Vector2.ONE * 2, (forecast_surface.size - Vector2.ONE * 4).max(Vector2.ZERO))
	var area = Rect2(inner.position + Vector2(minf(current, predicted) * inner.size.x, 0), Vector2(absf(current - predicted) * inner.size.x, inner.size.y))
	var tint = palette.color("text-danger" if forecast_change < 0 else "text-success")
	forecast_surface.draw_rect(area, Color(tint, 0.45))
	forecast_surface.draw_line(Vector2(inner.position.x + predicted * inner.size.x, inner.position.y), Vector2(inner.position.x + predicted * inner.size.x, inner.end.y), tint, 1)
