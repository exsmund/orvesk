extends "res://ui/character_page.gd"
## Initial allocation uses the same stat rows and resource bars as the hero window.
signal changed
var points: RichTextLabel
var hint: Label
var rows: Dictionary = {}
var divider = preload("res://ui/textured_divider.gd").new()
var resources = preload("res://ui/resource_stack.gd").new()
var health = resources.health
var stamina = resources.stamina

func configure(owner_ui):
	setup(owner_ui)
	points = RichTextLabel.new()
	points.bbcode_enabled = true
	points.scroll_active = false
	points.mouse_filter = Control.MOUSE_FILTER_IGNORE
	points.add_theme_font_override("normal_font", GothicTheme.DISPLAY_FONT)
	points.add_theme_font_size_override("normal_font_size", 27)
	canvas.add_child(points)
	hint = label("Живучесть увеличивает здоровье.", 16, true)
	hint.add_theme_color_override("font_color", host.data.color("text-muted"))
	canvas.add_child(divider)
	divider.configure(host.data)
	for stat in host.data.STATS:
		var entry = preload("res://ui/attribute_row.gd").new()
		canvas.add_child(entry)
		entry.configure(host.data, host.data.STAT_NAMES[stat], false, true)
		entry.changed.connect(func(delta): change(stat, delta))
		rows[stat] = entry
	canvas.add_child(resources)
	refresh()

func change(stat: String, delta: int):
	if stat not in rows or delta not in [-1, 1]: return
	if delta < 0 and host.create_stats[stat] <= host.session.MIN_STARTING_STAT: return
	if delta > 0 and host.session.creation_points_remaining(host.create_stats) <= 0: return
	host.create_stats[stat] += delta
	refresh()
	changed.emit()

func refresh():
	var left = host.session.creation_points_remaining(host.create_stats)
	points.text = "[center]Осталось очков: [color=#%s][font_size=34]%d[/font_size][/color][/center]" % [host.data.color("text-highlight").to_html(false), left]
	for stat in rows:
		rows[stat].refresh(host.session.MIN_STARTING_STAT, host.create_stats[stat] - host.session.MIN_STARTING_STAT, left > 0)
	var hp = host.data.max_hp({"stats": host.create_stats})
	health.configure(host.data, "Здоровье", hp, hp, "health")
	var energy = host.data.balance.stamina.max
	stamina.configure(host.data, "Выносливость", energy, energy, "stamina")
	arrange()

func layout_content():
	if rows.is_empty(): return
	if wide:
		put(points, 374, 26, 344, 48)
		put(divider, 0, 6, 352, divider.THICKNESS)
		for i in host.data.STATS.size(): put(rows[host.data.STATS[i]], 0, 8 + i * 68, 352, 68)
		put(hint, 4, 282, 344, 30)
		put(resources, 384, 164, 320, resources.HEIGHT)
	else:
		put(points, 0, 14, 360, 50)
		put(divider, 0, 96, 360, divider.THICKNESS)
		for i in host.data.STATS.size(): put(rows[host.data.STATS[i]], 0, 98 + i * 60, 360, 60)
		put(hint, 0, 351, 360, 34)
		put(resources, 20, 415, 320, resources.HEIGHT)
