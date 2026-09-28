shader_type canvas_item;
render_mode unshaded;
uniform vec4 tint : source_color;
uniform vec4 empty : source_color;
uniform sampler2D rim : source_color, filter_linear_mipmap;
uniform sampler2D grain : source_color, repeat_enable, filter_linear_mipmap;
uniform vec4 rim_region = vec4(0.0, 0.0, 1.0, 1.0);
uniform vec2 bar_size = vec2(100.0, 12.0);
uniform float fill : hint_range(0.0, 1.0) = 1.0;
// Event-driven Tween, no TIME loop. Fixed two-pixel rails at any bar width.
uniform bool animated = true;
float slice(float p, float extent, float cut) {
	float edge = min(2.0, extent * 0.25);
	if (p < edge) return p / edge * cut;
	if (p > extent - edge) return 1.0 - (extent - p) / edge * cut;
	return mix(cut, 1.0 - cut, (p - edge) / max(1.0, extent - edge * 2.0));
}
void fragment() {
	vec2 p = UV * bar_size;
	vec2 inside = clamp((p - vec2(2.0)) / max(vec2(1.0), bar_size - vec2(4.0)), vec2(0.0), vec2(1.0));
	// Repeat a short material sample instead of stretching its grain across a tablet.
	float material = texture(grain, vec2(p.x / 120.0, inside.y)).r;
	float bevel = 0.70 + 0.24 * (1.0 - inside.y);
	vec3 painted = tint.rgb * (0.58 + material * 1.20) * bevel;
	vec3 base = mix(empty.rgb * (0.60 + material * 0.30), painted, step(inside.x, fill) * step(0.0001, fill));
	vec2 source = vec2(slice(p.x, bar_size.x, 0.035), slice(p.y, bar_size.y, 0.12));
	vec4 border = texture(rim, rim_region.xy + source * rim_region.zw);
	COLOR = vec4(mix(base, border.rgb, border.a), 1.0);
}
