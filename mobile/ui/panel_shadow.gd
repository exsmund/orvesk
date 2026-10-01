extends ColorRect
## Isotropic Gaussian shadow shared by all framed panels.
const SIGMA = 14.0
const OFFSET = Vector2(0, 7)
const PADDING = SIGMA * 4
var shading = ShaderMaterial.new()
var panel_rect = Rect2()
var followed_panel: Control

func _init():
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	shading.shader = preload("res://shaders/header_shadow.gdshader")
	shading.set_shader_parameter("sigma", SIGMA)
	shading.set_shader_parameter("offset", OFFSET)
	material = shading

func configure(data):
	shading.set_shader_parameter("shade", data.color("base-black"))

func fit_panel(rect: Rect2):
	panel_rect = rect
	if not is_inside_tree(): return
	var viewport = get_parent().get_global_transform().affine_inverse() * get_viewport_rect()
	var bounds = Rect2(rect.position + OFFSET - Vector2.ONE * PADDING, rect.size + Vector2.ONE * PADDING * 2).intersection(viewport)
	position = bounds.position
	size = bounds.size
	shading.set_shader_parameter("panel_size", size)
	shading.set_shader_parameter("inset", rect.position - bounds.position)
	shading.set_shader_parameter("header_size", rect.size)

## Attach once behind a window surface; keep the same shader and geometry as the header.
func follow_panel(panel: Control, data):
	followed_panel = panel
	configure(data)
	panel.add_child(self)
	panel.move_child(self, 0)
	show_behind_parent = true
	set_notify_transform(true)
	panel.resized.connect(update_followed_panel)
	panel.item_rect_changed.connect(update_followed_panel)
	tree_entered.connect(update_followed_panel)
	update_followed_panel()

func update_followed_panel():
	if is_instance_valid(followed_panel):
		fit_panel(Rect2(Vector2.ZERO, followed_panel.size))

func _notification(what):
	if what == NOTIFICATION_TRANSFORM_CHANGED and is_instance_valid(followed_panel):
		update_followed_panel.call_deferred()
