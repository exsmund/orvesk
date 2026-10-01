extends "res://ui/result_panel.gd"
## Service offers share the result window and square reward targets.
signal inspected(index: int)
signal skipped
const GothicTheme = preload("res://ui/gothic_theme.gd")
const FittedLabel = preload("res://ui/fitted_label.gd")
var illustration = preload("res://ui/inspection_art.gd").new()
var heading = FittedLabel.new()
var choice_hint = FittedLabel.new()
var divider = preload("res://ui/header_divider.gd").new()
var rewards = preload("res://ui/reward_grid.gd").new()
var skip_button = Button.new()
var configured = false

func _init():
	super()
	illustration.custom_minimum_size = Vector2.ZERO
	for node in [illustration, heading, choice_hint, divider, rewards, skip_button]: canvas.add_child(node)
	rewards.inspected.connect(func(index): inspected.emit(index))
	skip_button.pressed.connect(func(): skipped.emit())
	resized.connect(arrange)

func configure(data, service_type: String, entries: Array):
	configure_panel(data)
	var texture = data.image(data.result_art.get(service_type, ""))
	illustration.configure(data, texture)
	illustration.visible = texture != null
	heading.text = data.map_point(service_type).name
	heading.base_font_size = 24
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	heading.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
	heading.add_theme_color_override("font_color", data.color("text-home"))
	choice_hint.text = "Можно выбрать только один предмет"
	choice_hint.base_font_size = 14
	choice_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	choice_hint.add_theme_color_override("font_color", data.color("text-muted"))
	rewards.configure(data, entries)
	skip_button.text = "Пройти мимо"
	skip_button.theme_type_variation = "SecondaryButton"
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
	var spacing = clampf(bounds.y / 500, 0.5, 1.0)
	var y = 4.0 * spacing
	if illustration.visible:
		var image_height = minf(180, minf(bounds.x * 0.55, bounds.y * 0.26))
		put(illustration, Rect2(0, y, bounds.x, image_height))
		y += image_height + 8 * spacing
	put(heading, Rect2(0, y, bounds.x, 38))
	y += 38
	put(choice_hint, Rect2(0, y, bounds.x, 24))
	y = arrange_choice_separator(divider, y + 24)
	var action_width = footer_action_width(bounds.x)
	var action_y = bounds.y - 56
	put(skip_button, Rect2((bounds.x - action_width) / 2, action_y, action_width, 52))
	GothicTheme.fit_button_text(skip_button, action_width, 18)
	put(rewards, Rect2(0, y, bounds.x, maxf(0, action_y - 16 - y)))
	rewards.arrange()
