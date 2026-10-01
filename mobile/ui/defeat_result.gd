extends "res://ui/result_panel.gd"
signal restarted
const GothicTheme = preload("res://ui/gothic_theme.gd")
const FittedLabel = preload("res://ui/fitted_label.gd")
var illustration = preload("res://ui/inspection_art.gd").new()
var title = FittedLabel.new()
var divider = preload("res://ui/header_divider.gd").new()
var message = Label.new()
var detail = Label.new()
var restart_button = Button.new()
var configured = false

func _init():
	super()
	illustration.custom_minimum_size = Vector2.ZERO
	for node in [illustration, title, divider, message, detail, restart_button]: canvas.add_child(node)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	title.text = "Поражение"
	for label in [message, detail]:
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	restart_button.text = "Начать карту заново"
	restart_button.pressed.connect(func(): restarted.emit())
	resized.connect(arrange)

func configure(data, lost_shards: int):
	configure_panel(data)
	illustration.configure(data, data.image(data.result_art.defeat))
	title.add_theme_color_override("font_color", data.color("text-home"))
	message.add_theme_color_override("font_color", data.color("text-home"))
	detail.add_theme_color_override("font_color", data.color("text-muted"))
	message.text = "Осколки остались у противника" if lost_shards > 0 else "Путь ещё не окончен"
	detail.text = "Победите его, чтобы вернуть\nнепотраченные осколки." if lost_shards > 0 else "Вернитесь к началу карты\nи попробуйте снова."
	configured = true
	arrange()

func put(node: Control, rect: Rect2):
	node.position = rect.position
	node.size = rect.size
	if node is FittedLabel: node.fit()

func arrange():
	if not configured or size.x <= 0: return
	arrange_panel()
	var bounds = canvas.size
	var wide = bounds.x > bounds.y * 1.6
	var unit = clampf(bounds.x / 520, 0.75, 1.1)
	var text_x = bounds.x * 0.36 if wide else 0.0
	var text_width = bounds.x - text_x
	var button_height = 52.0
	title.base_font_size = 48 * unit
	message.add_theme_font_size_override("font_size", roundi(23 * unit))
	detail.add_theme_font_size_override("font_size", roundi(18 * unit))
	message.size.x = text_width
	detail.size.x = text_width
	var title_height = 62 * unit
	var message_height = maxf(38 * unit, message.get_minimum_size().y)
	var detail_height = maxf(48 * unit, detail.get_minimum_size().y)
	var gap = 12 * unit
	var text_height = title_height + 12 + message_height + detail_height + gap * 4 + button_height
	var image_height = minf(maxf(1, bounds.y - text_height - gap), bounds.x * 0.58)
	var y = maxf(0, (bounds.y - text_height) / 2)
	if wide:
		put(illustration, Rect2(0, 0, text_x - 12, bounds.y))
	else:
		y = maxf(0, (bounds.y - text_height - image_height - gap) / 2)
		put(illustration, Rect2(0, y, bounds.x, image_height))
		y += image_height + gap
	put(title, Rect2(text_x, y, text_width, title_height))
	y += title_height + gap
	put(divider, Rect2(text_x + text_width * 0.05, y, text_width * 0.9, 12))
	y += 12 + gap
	put(message, Rect2(text_x, y, text_width, message_height))
	y += message_height + gap
	put(detail, Rect2(text_x, y, text_width, detail_height))
	y += detail_height + gap
	var action_width = footer_action_width(text_width)
	put(restart_button, Rect2(text_x + (text_width - action_width) / 2, y, action_width, button_height))
	GothicTheme.fit_button_text(restart_button, action_width, 18)
