extends RefCounted
## Two soft layers: an oval sized to the caption, then blurred glyphs.
static var oval: GradientTexture2D

static func draw_oval(canvas: RID, bounds: Rect2, font_size: float, color: Color):
	if not oval:
		var gradient = Gradient.new()
		gradient.offsets = PackedFloat32Array([0.0, 0.25, 0.6, 1.0])
		gradient.colors = PackedColorArray([Color.WHITE, Color(1, 1, 1, 0.85), Color(1, 1, 1, 0.3), Color(1, 1, 1, 0)])
		gradient.interpolation_mode = Gradient.GRADIENT_INTERPOLATE_CUBIC
		oval = GradientTexture2D.new()
		oval.gradient = gradient
		oval.width = 256
		oval.height = 128
		oval.fill = GradientTexture2D.FILL_RADIAL
		oval.fill_from = Vector2(0.5, 0.5)
		oval.fill_to = Vector2(1, 0.5)
	var extent = Vector2(maxf(bounds.size.x * 1.24, bounds.size.x + font_size * 0.8), font_size * 2.9) * 1.5
	oval.draw_rect(canvas, Rect2(bounds.get_center() - extent * 0.5 + Vector2(0, 1.5), extent), false, Color(color, color.a * 0.5))


static func samples(font_size: float) -> Array:
	var result: Array = []
	var sigma = clampf(font_size * 0.12, 1.5, 3.0)
	var total = 0.0
	for y in range(-2, 3):
		for x in range(-2, 3):
			var weight = exp(-0.5 * float(x * x + y * y))
			result.append(Vector3(x * sigma, y * sigma, weight))
			total += weight
	for i in result.size(): result[i].z /= total
	return result

static func draw_paragraph(canvas: RID, paragraph: TextParagraph, position: Vector2, font_size: float, color: Color):
	for sample in samples(font_size):
		paragraph.draw(canvas, position + Vector2(sample.x, sample.y), Color(color, color.a * sample.z * 1.6))
	paragraph.draw(canvas, position, Color(color, color.a * 0.35))

static func draw_string(canvas: RID, font: Font, position: Vector2, text: String, font_size: int, color: Color):
	for sample in samples(font_size):
		font.draw_string(canvas, position + Vector2(sample.x, sample.y), text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, Color(color, color.a * sample.z * 1.6))
	font.draw_string(canvas, position, text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, Color(color, color.a * 0.35))
