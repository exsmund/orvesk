extends Control
## Shared read-only list for creatures, equipment and skills.
const Slot = preload("res://ui/equipment_slot.gd")
const RoundPortrait = preload("res://ui/round_portrait.gd")
var entries: Array = []
var icons: Array = []
var host
var panel = Control.new()
var surface = preload("res://ui/character_surface.gd").new()
var frame = preload("res://ui/texture_frame.gd").new()
var header = preload("res://ui/window_header.gd").new()
var actions = preload("res://ui/window_actions.gd").new()
var scroll = ScrollContainer.new()
var list = VBoxContainer.new()

func arrange():
	if not host or size.x <= 0: return
	panel.size = Vector2(minf(680, size.x), minf(920, size.y))
	panel.position = Vector2((size.x - panel.size.x) / 2, size.y - panel.size.y)
	var top = header.arrange(panel.size)
	actions.arrange(panel.size)
	var bottom = actions.position.y + actions.back.position.y - 16
	scroll.position = Vector2(24, top + 16)
	scroll.size = Vector2(panel.size.x - 48, maxf(1, bottom - scroll.position.y))


func configure(owner_ui, creatures: bool, skills_catalog: bool = false):
	host = owner_ui
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(panel)
	panel.add_child(surface)
	surface.configure(host.data, 26, 0.68)
	surface.frame.hide()
	surface.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	preload("res://ui/panel_shadow.gd").new().follow_panel(panel, host.data)
	panel.add_child(header)
	header.configure(host.data)
	header.title.text = "Навыки" if skills_catalog else ("Существа" if creatures else "Экипировка")
	panel.add_child(scroll)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.follow_focus = true
	scroll.add_child(list)
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation", 14)
	panel.add_child(actions)
	actions.primary.hide()
	actions.back.pressed.connect(host.return_from_catalog)
	# Keep the decorative rim above the header surface, as in the hero window.
	panel.add_child(frame)
	frame.configure(host.data, 26)
	frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	resized.connect(arrange)
	arrange.call_deferred()
	entries = (host.data.skills if skills_catalog else (host.data.creatures if creatures else host.data.items)).duplicate()
	entries.sort_custom(func(a, b): return a.name.naturalnocasecmp_to(b.name) < 0)
	for entry in entries:
		var line = HBoxContainer.new()
		line.add_theme_constant_override("separation", 18)
		list.add_child(line)
		var icon = RoundPortrait.new() if creatures else Slot.new()
		icon.custom_minimum_size = Vector2(88, 88)
		line.add_child(icon)
		var path = entry.get("art", "") if skills_catalog else (entry.get("portrait", {}).get("src", "") if creatures else host.data.art.get(entry.id, ""))
		icon.configure(host.data, host.data.image(path))
		icon.tooltip_text = entry.name
		icon.pressed.connect(func():
			if skills_catalog: host.show_skill_catalog_entry(entry.id)
			else: host.show_catalog_entry(entry.id, creatures))
		icons.append(icon)
		host.label(entry.name, 20, "text-home", line).size_flags_horizontal = Control.SIZE_EXPAND_FILL
