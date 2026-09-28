extends Container
## Shared centered bounds for every page. Shadows may extend outside this frame.
const Layout = preload("res://ui/adaptive_layout.gd")

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _notification(what):
	if what != NOTIFICATION_SORT_CHILDREN: return
	var bounds = Layout.content_rect(size)
	for child in get_children():
		if child is Control and child.visible:
			fit_child_in_rect(child, bounds)
