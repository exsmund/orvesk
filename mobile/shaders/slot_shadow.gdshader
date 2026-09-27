shader_type canvas_item;
render_mode unshaded;
uniform vec4 shadow_color : source_color;

void fragment() {
	vec2 edges = min(UV, vec2(1.0) - UV);
	float inward = 1.0 - smoothstep(0.02, 0.24, min(edges.x, edges.y));
	COLOR = vec4(shadow_color.rgb, shadow_color.a * inward);
}
