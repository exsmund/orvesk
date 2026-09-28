extends VBoxContainer
## The full resource block shared by the hero tab and creation preview.
const HEIGHT = 105.0
var health = preload("res://ui/resource_bar.gd").new()
var stamina = preload("res://ui/resource_bar.gd").new()

func _init():
	add_theme_constant_override("separation", 13)
	for bar in [health, stamina]:
		add_child(bar)
		bar.custom_minimum_size.y = 46
