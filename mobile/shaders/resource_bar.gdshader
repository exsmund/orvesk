shader_type canvas_item;
uniform vec4 tint : source_color;
uniform float fill : hint_range(0.0, 1.0) = 1.0;
// Kept as a preference flag; animation is an event-driven Tween, never a TIME loop.
uniform bool animated = true;
void fragment() {
	float bevel = 0.76 + 0.20 * (1.0 - UV.y);
	float highlight = (1.0 - smoothstep(0.0, 0.16, UV.y)) * 0.15;
	COLOR = vec4(tint.rgb * bevel + highlight, tint.a * step(UV.x, fill));
}
