extends VBoxContainer
const SHADER = preload("res://shaders/resource_bar.gdshader")
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

func _init():
	add_child(caption_row)
	caption_row.add_theme_constant_override("separation", 3)
	caption_row.add_child(icon)
	icon.custom_minimum_size = Vector2(14, 14)
	caption_row.add_child(label)
	caption_row.add_child(forecast_label)
	caption_row.add_child(value_label)
	value_label.add_theme_font_size_override("font_size", 14)
	value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	value_label.clip_text = true
	value_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	forecast_label.add_theme_font_size_override("font_size", 13)
	label.add_theme_font_size_override("font_size", 14)
	track.custom_minimum_size.y = 14
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
	surface.material = shader_material

func make_compact():
	track.custom_minimum_size.y = 10
	label.add_theme_font_size_override("font_size", 14)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_theme_constant_override("separation", 2)

func set_animation(enabled: bool):
	shader_material.set_shader_parameter("animated", enabled)
	if not enabled:
		if animation: animation.kill()
		set_fill(target_fraction)

func set_fill(value: float):
	fraction = value
	shader_material.set_shader_parameter("fill", value)

func configure(data, caption: String, value: float, maximum: float, kind: String, animate: bool, change: float = 0.0):
	palette = data
	displayed_value = value
	limit = maxf(1, maximum)
	forecast_change = change
	icon.configure(kind, data.color("text-danger" if kind == "health" else "text-home"))
	value_label.clip_text = caption.is_empty()
	label.text = caption
	label.visible = not caption.is_empty()
	value_label.size_flags_horizontal = Control.SIZE_SHRINK_END if caption else Control.SIZE_EXPAND_FILL
	value_label.text = "%s / %s" % [number(value), number(maximum)]
	value_label.add_theme_color_override("font_color", data.color("text-home"))
	forecast_label.text = ("−" if change < 0 else "+") + number(absf(change)) if not is_zero_approx(change) else ""
	forecast_label.visible = not is_zero_approx(change)
	forecast_label.add_theme_color_override("font_color", data.color("text-danger" if change < 0 and kind == "health" else "text-highlight"))
	label.add_theme_color_override("font_color", data.color("text-home"))
	label.add_theme_color_override("font_outline_color", data.color("background-page"))
	# Reuse the canonical effect colors used by the web ResourceBar.
	shader_material.set_shader_parameter("tint", data.color("effect-resource-health" if kind == "health" else "effect-resource-stamina"))
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
	var frame = StyleBoxFlat.new()
	frame.bg_color = data.color("background-panel")
	frame.border_color = data.color("border-style-7-2")
	frame.set_border_width_all(1)
	frame.set_content_margin_all(2)
	track.add_theme_stylebox_override("panel", frame)
	forecast_surface.queue_redraw()

func number(value: float) -> String:
	return str(snappedf(value, 0.1)).trim_suffix(".0")

func draw_forecast():
	if not palette or is_zero_approx(forecast_change): return
	var current = clampf(displayed_value / limit, 0, 1)
	var predicted = clampf((displayed_value + forecast_change) / limit, 0, 1)
	var area = Rect2(Vector2(minf(current, predicted) * forecast_surface.size.x, 0), Vector2(absf(current - predicted) * forecast_surface.size.x, forecast_surface.size.y))
	var tint = palette.color("text-danger" if forecast_change < 0 else "text-success")
	forecast_surface.draw_rect(area, Color(tint, 0.45))
	forecast_surface.draw_line(Vector2(predicted * forecast_surface.size.x, 0), Vector2(predicted * forecast_surface.size.x, forecast_surface.size.y), tint, 2)
