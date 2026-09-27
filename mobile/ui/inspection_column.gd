extends Container
## Keep a short comparison column visible once its own content has finished scrolling.
var content = VBoxContainer.new()
var offset_y = 0.0

func _init():
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mouse_filter = Control.MOUSE_FILTER_PASS
	content.add_theme_constant_override("separation",24)
	add_child(content)
	content.minimum_size_changed.connect(func():
		update_minimum_size()
		queue_sort())

func _get_minimum_size() -> Vector2:
	return content.get_combined_minimum_size() if is_instance_valid(content) else Vector2.ZERO

func _notification(what):
	if what == NOTIFICATION_SORT_CHILDREN:
		fit_child_in_rect(content,Rect2(Vector2(0,offset_y),Vector2(size.x,content.get_combined_minimum_size().y)))

func follow_scroll(viewport: Rect2, sticky: bool):
	var next = 0.0
	if sticky:
		var height = content.get_combined_minimum_size().y
		var remaining = maxf(0,height-viewport.size.y)
		var scrolled = viewport.position.y-global_position.y
		next = clampf(scrolled-remaining,0,maxf(0,size.y-height))
	if not is_equal_approx(next,offset_y):
		offset_y = next
		queue_sort()
