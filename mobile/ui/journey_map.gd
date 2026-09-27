extends Control
## A view of the saved graph. Selection never advances the session or consumes RNG.
signal node_selected(id: String)
const GothicTheme = preload("res://ui/gothic_theme.gd")
var host
var selected = ""
var markers: Dictionary = {}
var radius = 27.0

func configure(controller):
	host = controller
	for node in host.session.game.journey.map.nodes:
		var marker = TextureButton.new()
		marker.texture_normal = icon_for(node)
		marker.ignore_texture_size = true
		marker.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
		marker.tooltip_text = node.name
		marker.pressed.connect(func(): node_selected.emit(node.id))
		add_child(marker)
		markers[node.id] = marker
	resized.connect(arrange)
	arrange()

func icon_for(node: Dictionary) -> Texture2D:
	var kind = node.kind
	if kind == "fight": kind = "champion" if node.stage == 5 else "battle"
	return GothicTheme.trim_texture(host.data.image("/ui/journey/%s-v1.png" % kind))

func point(node: Dictionary) -> Vector2:
	var inset = radius + 5
	return Vector2.ONE * inset + Vector2(node.x, node.y) / 100 * (size - Vector2.ONE * inset * 2)

func arrange():
	if not host or not is_inside_tree(): return
	radius = clampf(minf(size.x / 12, size.y / 19), 22, 32)
	var available = host.session.available_nodes()
	for node in host.session.game.journey.map.nodes:
		var marker = markers[node.id]
		marker.position = point(node) - Vector2.ONE * radius
		marker.size = Vector2.ONE * radius * 2
		marker.modulate = Color.WHITE if node.id == selected or node.id in available or node.id in host.session.game.journey.path else Color(0.6, 0.6, 0.55)
	queue_redraw()

func _draw():
	if not host or not is_inside_tree(): return
	var data = host.data
	var journey = host.session.game.journey
	for edge in journey.map.edges:
		var a = point(data.lookup(journey.map.nodes, edge[0]))
		var b = point(data.lookup(journey.map.nodes, edge[1]))
		var visited = edge[0] in journey.path and edge[1] in journey.path
		var tint = data.color("text-success" if visited else "text-highlight")
		var delta = b - a
		var length = delta.length()
		for distance in range(int(radius + 4), int(length - radius - 4), 10):
			draw_circle(a + delta.normalized() * distance, 1.5, Color(tint, 0.8 if visited else 0.6))
	for node in journey.map.nodes:
		var center = point(node)
		if node.id == selected:
			draw_arc(center, radius + 4, 0, TAU, 48, data.color("text-home"), 2, true)
		if node.id == host.session.current_node():
			draw_circle(center + Vector2(0, radius + 7), 3, data.color("text-success"))
		if node.kind == "fight":
			var text = "✓" if node.stage <= journey.cleared else str(int(node.stage))
			var badge = Rect2(center + Vector2(radius - 10, radius - 14), Vector2(20, 20))
			draw_style_box(GothicTheme.panel(data, 0), badge)
			draw_string(ThemeDB.fallback_font, badge.position + Vector2(0, 15), text, HORIZONTAL_ALIGNMENT_CENTER, 20, 13, data.color("text-home"))
