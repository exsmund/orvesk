extends VBoxContainer
## Shared read-only list for the bestiary and equipment catalog.
const Slot = preload("res://ui/equipment_slot.gd")
var entries: Array = []
var icons: Array = []

func configure(host, creatures: bool):
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	add_theme_constant_override("separation", 14)
	entries = (host.data.creatures if creatures else host.data.items).duplicate()
	entries.sort_custom(func(a, b): return a.name.naturalnocasecmp_to(b.name) < 0)
	for entry in entries:
		var line = HBoxContainer.new()
		line.add_theme_constant_override("separation", 18)
		add_child(line)
		var icon = Slot.new()
		icon.custom_minimum_size = Vector2(88, 88)
		line.add_child(icon)
		var path = entry.get("portrait", {}).get("src", "") if creatures else host.data.art.get(entry.id, "")
		icon.configure(host.data, host.data.image(path))
		icon.tooltip_text = entry.name
		icon.pressed.connect(func(): host.show_catalog_entry(entry.id, creatures))
		icons.append(icon)
		host.label(entry.name, 20, "text-home", line).size_flags_horizontal = Control.SIZE_EXPAND_FILL
