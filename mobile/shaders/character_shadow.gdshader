shader_type canvas_item;
render_mode unshaded;
uniform vec4 shadow_color : source_color;
uniform vec2 panel_size = vec2(400.0, 800.0);
uniform float header_height = 64.0;

void fragment() {
	vec2 p = UV * panel_size;
	vec2 edge = min(p, panel_size - p);
	float inner = 1.0 - smoothstep(2.0, 48.0, min(edge.x, edge.y));
	float under_header = step(header_height, p.y) * (1.0 - smoothstep(header_height, header_height + 58.0, p.y));
	COLOR = vec4(shadow_color.rgb, max(inner * 0.88, under_header * 0.75));
}
