extends VBoxContainer
const GothicTheme = preload("res://ui/gothic_theme.gd")
var host
var fighter: Dictionary
var portrait_area = Control.new()
var portrait = preload("res://ui/portrait_art.gd").new()
var fighter_name = Label.new()
var level = Label.new()
var equipment

func configure(owner_ui, actor: Dictionary):
	host = owner_ui
	fighter = actor
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_theme_constant_override("separation", 8)
	add_child(portrait_area)
	portrait_area.mouse_filter = Control.MOUSE_FILTER_IGNORE
	portrait_area.add_child(portrait)
	portrait.configure(host.data, host.data.portrait(fighter))
	for label in [fighter_name, level]:
		add_child(label)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.add_theme_font_override("font", GothicTheme.DISPLAY_FONT)
		label.add_theme_color_override("font_color", host.data.color("text-home"))
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	fighter_name.text = fighter.name
	fighter_name.clip_text = true
	level.text = "Уровень %d" % host.data.level(fighter)
	level.add_theme_font_size_override("font_size", 19)
	if not host.data.equipment_slots(fighter).is_empty():
		var divider = preload("res://ui/textured_divider.gd").new()
		add_child(divider)
		divider.configure(host.data)
		divider.custom_minimum_size.y = divider.THICKNESS
		equipment = preload("res://ui/character_equipment.gd").new()
		add_child(equipment)
		equipment.configure(host, fighter, func(reference): host.show_enemy_item(reference, fighter))
	resized.connect(arrange)
	arrange()

func arrange():
	if not host: return
	var width = maxf(1, size.x)
	var height = minf(360, width)
	portrait_area.custom_minimum_size.y = height
	portrait.fit_in(Rect2(0, 0, width, height))
	var font_size = 30
	while font_size > 14 and GothicTheme.DISPLAY_FONT.get_string_size(fighter_name.text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x > width:
		font_size -= 1
	fighter_name.add_theme_font_size_override("font_size", font_size)
	if is_instance_valid(equipment): equipment.custom_minimum_size.y = 410 * minf(1, width / 360)
