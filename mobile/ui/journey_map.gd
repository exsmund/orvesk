extends Control
## Scrollable projection of the saved graph. Viewing never advances play or consumes RNG.
signal node_selected(id: String)
const GothicTheme = preload("res://ui/gothic_theme.gd")
const Shards = preload("res://ui/shard_counter.gd")
var host
var selected = ""
var markers: Dictionary = {}
var shadows: Dictionary = {}
var shadow_layer = Control.new()
var centers: Dictionary = {}
var radius = 36.0
var shard_badge = Shards.new()
var badges = Control.new()

func configure(controller):
	host = controller
	var journey = host.session.game.journey
	var available = host.session.available_nodes()
	add_child(shadow_layer)
	shadow_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for node in journey.map.nodes:
		var shadow = ColorRect.new()
		shadow.mouse_filter = Control.MOUSE_FILTER_IGNORE
		shadow.material = ShaderMaterial.new()
		shadow.material.shader = preload("res://shaders/circle_shadow.gdshader")
		shadow_layer.add_child(shadow)
		shadows[node.id] = shadow
		var marker = TextureButton.new()
		marker.ignore_texture_size = true
		marker.stretch_mode = TextureButton.STRETCH_SCALE
		marker.tooltip_text = node.name
		marker.pressed.connect(func(): node_selected.emit(node.id))
		add_child(marker)
		markers[node.id] = marker
		marker.texture_normal = host.data.image(host.data.map_points.presentation.rim)
		var layers = ShaderMaterial.new()
		layers.shader = preload("res://shaders/map_portrait.gdshader")
		layers.set_shader_parameter("backing", host.data.image(host.data.map_points.presentation.background))
		var current = node.id == host.session.current_node()
		var revealed = current or node.id in journey.path or node.id in available or is_skipped(node) or node.id == journey.get("returnFromDefeat", {}).get("nodeId", "") or node.id == journey.get("lostSouls", {}).get("nodeId", "")
		layers.set_shader_parameter("show_content", revealed)
		layers.set_shader_parameter("is_portrait", current)
		layers.set_shader_parameter("grayscale", not current and (node.id in journey.path or is_skipped(node)))
		if revealed:
			layers.set_shader_parameter("content_texture", host.data.portrait(host.session.game.player) if current else host.data.image(host.data.point_for_node(node).icon.symbol))
		if current:
			layers.set_shader_parameter("content_box", Vector4(0.08, 0.08, 0.84, 0.84))
			var crop = host.data.portrait_presentation.circle.squareCrop
			layers.set_shader_parameter("square_crop", Vector4(crop.x, crop.y, crop.width, crop.height))
		marker.material = layers
		if not revealed: marker.tooltip_text = "Непосещённая точка"
	add_child(badges)
	badges.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badges.draw.connect(draw_badges)
	add_child(shard_badge)
	var lost = journey.get("lostSouls", {})
	shard_badge.visible = int(lost.get("amount", 0)) > 0 and markers.has(lost.get("nodeId", ""))
	if shard_badge.visible:
		shard_badge.font_size = 18
		shard_badge.alignment = HORIZONTAL_ALIGNMENT_CENTER
		shard_badge.configure(host.data, int(lost.amount))
		shard_badge.tooltip_text = "Оставленные осколки"
	mouse_filter = Control.MOUSE_FILTER_PASS

func show_return_point(id: String, portrait: bool):
	if not markers.has(id): return
	var layers = markers[id].material
	var node = host.data.lookup(host.session.game.journey.map.nodes, id)
	var enemy = host.session.game.journey.enemies.get(id, {})
	layers.set_shader_parameter("show_content", true)
	layers.set_shader_parameter("is_portrait", portrait and not enemy.is_empty())
	layers.set_shader_parameter("grayscale", false)
	layers.set_shader_parameter("content_texture", host.data.portrait(enemy) if portrait and not enemy.is_empty() else host.data.image(host.data.point_for_node(node).icon.symbol))
	layers.set_shader_parameter("content_box", Vector4(0.08, 0.08, 0.84, 0.84) if portrait else Vector4(0.19, 0.19, 0.62, 0.62))
	var crop = host.data.portrait_presentation.circle.squareCrop
	layers.set_shader_parameter("square_crop", Vector4(crop.x, crop.y, crop.width, crop.height))

func node_rank(node: Dictionary) -> int:
	return 0 if node.id == "camp-start" else int(node.stage) * 2 - (1 if node.kind == "fight" else 0)

func is_skipped(node: Dictionary) -> bool:
	var journey = host.session.game.journey
	if node.id in journey.path or node.id in host.session.available_nodes(): return false
	var current = host.data.lookup(journey.map.nodes, host.session.current_node())
	return not current.is_empty() and node_rank(node) <= node_rank(current)

func icon_for(node: Dictionary) -> Texture2D:
	return host.data.image(host.data.point_for_node(node).get("icon", {}).get("src", ""))

func point(node: Dictionary) -> Vector2:
	return centers.get(node.id, Vector2.ZERO)

func layout(view_size: Vector2, diameter: float):
	radius = diameter / 2.0
	var rows: Dictionary = {}
	for node in host.session.game.journey.map.nodes:
		var row = node_rank(node)
		if not rows.has(row): rows[row] = []
		rows[row].append(node)
	var keys = rows.keys()
	keys.sort()
	var columns = 1
	for row in rows.values(): columns = maxi(columns, row.size())
	var step_y = diameter * 1.85
	# The two outer arms have equal horizontal/vertical offsets: a 90° fork.
	var half_branch_width = step_y if columns > 1 else 0.0
	var world_width = maxf(view_size.x, half_branch_width * 2 + diameter * 2)
	# End padding permits centering even the first/last available row.
	var padding = view_size.y * 0.5
	custom_minimum_size = Vector2(world_width, (keys.size() - 1) * step_y + view_size.y)
	size = custom_minimum_size
	centers.clear()
	for index in keys.size():
		var row: Array = rows[keys[index]]
		for column in row.size():
			var offset = 0.0 if row.size() == 1 else lerpf(-half_branch_width, half_branch_width, float(column) / (row.size() - 1))
			centers[row[column].id] = Vector2(world_width / 2 + offset, padding + (keys.size() - 1 - index) * step_y)
	arrange()

func arrange():
	if not host: return
	for id in markers:
		var marker = markers[id]
		marker.position = centers.get(id, Vector2.ZERO) - Vector2.ONE * radius
		marker.size = Vector2.ONE * radius * 2
		var shadow = shadows[id]
		var blur = maxf(2, radius * 0.12)
		shadow.size = Vector2.ONE * (radius * 2 + blur * 8)
		shadow.position = centers.get(id, Vector2.ZERO) + Vector2(0, 2) - shadow.size / 2
		shadow.material.set_shader_parameter("panel_size", shadow.size)
		shadow.material.set_shader_parameter("radius", radius * 0.95)
		shadow.material.set_shader_parameter("sigma", blur)
		shadow.material.set_shader_parameter("shade", Color(host.data.color("text-highlight" if id == selected else "base-black"), 0.72))
	if shard_badge.visible:
		var id = host.session.game.journey.lostSouls.nodeId
		shard_badge.size = Vector2(60, 28)
		shard_badge.position = centers.get(id, Vector2.ZERO) + Vector2(radius + 8, -shard_badge.size.y / 2)
	queue_redraw()
	badges.size = size
	badges.queue_redraw()

func active_center() -> Vector2:
	var active = host.session.available_nodes()
	if active.is_empty(): active = [host.session.current_node()]
	var center = Vector2.ZERO
	for id in active: center += centers.get(id, Vector2.ZERO)
	return center / active.size()

func edge_points(a: Vector2, b: Vector2) -> PackedVector2Array:
	return PackedVector2Array([a, b])

func check_color() -> Color:
	return Color.from_hsv(0, 0, host.data.color("text-home").v)

func _draw():
	if not host or centers.is_empty(): return
	var data = host.data
	var journey = host.session.game.journey
	# Deduplicate dots on shared branches; all segments are aligned center-to-center.
	var dots: Dictionary = {}
	for edge in journey.map.edges:
		if not centers.has(edge[0]) or not centers.has(edge[1]): continue
		var accessible = edge[0] == host.session.current_node() and edge[1] in host.session.available_nodes()
		var tint = data.color("text-success") if accessible else check_color()
		var points = edge_points(centers[edge[0]], centers[edge[1]])
		for i in points.size() - 1:
			var delta = points[i + 1] - points[i]
			var count = maxi(1, int(ceil(delta.length() / 12.0)))
			for dot in count + 1:
				var position = points[i].lerp(points[i + 1], float(dot) / count)
				dots[position.snapped(Vector2.ONE)] = tint
	for position in dots: draw_circle(position, 3.0, dots[position], true)
	for node in journey.map.nodes:
		var center: Vector2 = centers[node.id]
		if node.id == selected:
			draw_arc(center, radius * 0.97, 0, TAU, 64, data.color("text-highlight"), 1.4, true)

func draw_badges():
	if not host or centers.is_empty(): return
	for node in host.session.game.journey.map.nodes:
		if node.id not in host.session.game.journey.path or node.id == host.session.current_node(): continue
		var center: Vector2 = centers[node.id] + Vector2.ONE * radius * 0.70
		var r = radius * 0.35
		badges.draw_circle(center, r, host.data.color("background-page"), true)
		badges.draw_arc(center, r, 0, TAU, 48, Color.from_hsv(0, 0, host.data.color("text-muted").v), 1.3, true)
		badges.draw_polyline(PackedVector2Array([center + Vector2(-0.48, -0.02) * r, center + Vector2(-0.12, 0.38) * r, center + Vector2(0.53, -0.43) * r]), check_color(), 2.0, true)
	if shard_badge.visible:
		var frame = StyleBoxFlat.new()
		frame.bg_color = host.data.color("background-page")
		frame.border_color = Color.from_hsv(0, 0, host.data.color("text-muted").v)
		frame.set_border_width_all(1)
		frame.set_corner_radius_all(14)
		badges.draw_style_box(frame, shard_badge.get_rect())
