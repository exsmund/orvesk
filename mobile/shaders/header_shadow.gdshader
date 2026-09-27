shader_type canvas_item;
uniform vec4 shade : source_color;
uniform vec2 panel_size;
uniform vec2 left_center;
uniform vec2 right_center;
uniform vec2 lane_size;
uniform bool show_right = true;
void fragment() {
	vec2 p = UV * panel_size;
	float left = exp(-2.2 * pow(length((p - left_center) / lane_size), 2.0));
	float right = show_right ? exp(-2.2 * pow(length((p - right_center) / lane_size), 2.0)) : 0.0;
	float lower = 0.30 * (1.0 - smoothstep(0.45, 1.0, UV.y));
	COLOR = vec4(shade.rgb, shade.a * max(max(left, right) * 0.94, lower));
}
