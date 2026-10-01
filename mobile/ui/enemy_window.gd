extends "res://ui/inspection_window.gd"
## Read-only fighter snapshot. Nested equipment inspection restores this window first.
var profile = preload("res://ui/enemy_profile.gd").new()

func configure_enemy(owner_ui, fighter: Dictionary):
	configure(owner_ui, [], {"title":"Противник", "max_width":560})
	columns.hide()
	body.add_child(profile)
	profile.configure(host, fighter.duplicate(true))
	arrange()

func close():
	if closing: return
	if is_instance_valid(host.inspection_window): host.inspection_window.close()
	super.close()
	if host.enemy_window == self: host.enemy_window = null

func _input(event):
	if is_instance_valid(host.inspection_window): return
	super._input(event)
