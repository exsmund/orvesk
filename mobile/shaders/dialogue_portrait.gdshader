shader_type canvas_item;
uniform vec2 horizontal_clip = vec2(0.0, 1.0);
uniform vec2 fade_range = vec2(0.68, 0.99);
void fragment() {
	if (UV.x < horizontal_clip.x || UV.x > horizontal_clip.y) { discard; }
	vec4 image = texture(TEXTURE, UV);
	image.a *= 1.0 - smoothstep(fade_range.x, fade_range.y, UV.y);
	COLOR = image;
}
