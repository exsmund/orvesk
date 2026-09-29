shader_type canvas_item;
uniform vec2 horizontal_clip = vec2(0.0, 1.0);
void fragment() {
	if (UV.x < horizontal_clip.x || UV.x > horizontal_clip.y) { discard; }
	vec4 image = texture(TEXTURE, UV);
	image.a *= 1.0 - smoothstep(0.68, 0.99, UV.y);
	COLOR = image;
}
