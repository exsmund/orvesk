extends "res://ui/modal_dialog.gd"
## Four illustrated lessons; acknowledging and hiding are saved by the owner.
signal answered(hide_future: bool)
var error_label = Label.new()
var actions = preload("res://ui/window_actions.gd").new()
var lessons: Array[VBoxContainer] = []
var illustrations: Array[TextureRect] = []

func _init():
	super()
	name = "CombatHelp"
	# Reuse the heroes screen footer, preserving the modal's button API.
	primary.free()
	secondary.free()
	primary = actions.primary
	secondary = actions.back
	primary.pressed.connect(accept)
	secondary.pressed.connect(func():
		if not closing: alternative_confirmed.emit())
	panel.add_child(actions)
	panel.move_child(actions, frame.get_index())
	use_message = false
	dialog_hide_on_ok = false
	secondary_is_action = true
	confirmed.connect(func(): answered.emit(false))
	alternative_confirmed.connect(func(): answered.emit(true))
	content.add_theme_constant_override("separation", 26)
	content.add_child(error_label)
	error_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	error_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	error_label.hide()

func configure(data):
	var guide: Dictionary = data.read_json("combat-help")
	title = guide.title
	ok_button_text = guide.confirmLabel
	cancel_button_text = guide.hideLabel
	for lesson in lessons:
		content.remove_child(lesson)
		lesson.queue_free()
	lessons.clear()
	illustrations.clear()
	for section in guide.sections:
		var lesson = VBoxContainer.new()
		lesson.name = section.id
		lesson.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		lesson.add_theme_constant_override("separation", 10)
		content.add_child(lesson)
		lessons.append(lesson)
		var paragraph = Label.new()
		paragraph.text = section.text
		paragraph.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		paragraph.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		paragraph.mouse_filter = Control.MOUSE_FILTER_IGNORE
		paragraph.add_theme_font_override("font", GothicTheme.BODY_FONT)
		paragraph.add_theme_font_size_override("font_size", 18)
		paragraph.add_theme_color_override("font_color", data.color("text-home"))
		lesson.add_child(paragraph)
		var illustration = TextureRect.new()
		illustration.texture = data.image(section.image)
		illustration.tooltip_text = section.alt
		illustration.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		illustration.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		illustration.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		illustration.custom_minimum_size.y = 140
		illustration.mouse_filter = Control.MOUSE_FILTER_IGNORE
		lesson.add_child(illustration)
		illustrations.append(illustration)
	content.move_child(error_label, content.get_child_count() - 1)
	error_label.add_theme_color_override("font_color", data.color("text-danger"))

func popup_centered(dimensions: Vector2i = Vector2i.ZERO):
	super(dimensions)
	secondary.remove_theme_stylebox_override("focus")
	primary.grab_focus()

func arrange():
	super()
	if not configured or closing: return
	var footer_top = actions.arrange(panel.size)
	scroll.size.y = maxf(1, footer_top - 18 - scroll.position.y)
	for illustration in illustrations:
		if not illustration.texture: continue
		var texture_size = illustration.texture.get_size()
		var height = content.size.x * texture_size.y / maxf(1, texture_size.x)
		if not is_equal_approx(illustration.custom_minimum_size.y, height):
			illustration.custom_minimum_size.y = height

func cancel():
	# Escape/Back acknowledges this battle, never selects 'do not show again'.
	if not closing: answered.emit(false)

func show_error(text: String):
	error_label.text = text
	error_label.show()
	arrange()
	scroll.set_deferred("scroll_vertical", int(scroll.get_v_scroll_bar().max_value))
