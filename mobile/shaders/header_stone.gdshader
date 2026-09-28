shader_type canvas_item;
render_mode unshaded;
uniform sampler2D stone : source_color, repeat_enable, filter_linear_mipmap;
uniform vec2 panel_size = vec2(444.0, 132.0);

void fragment() {
	vec2 p = UV * panel_size;
	vec3 grain = texture(stone, p / 740.0).rgb;
	float edge = min(min(p.x, panel_size.x - p.x), min(p.y, panel_size.y - p.y));
	float inset = 1.0 - smoothstep(2.0, 25.0, edge);
	float top = 1.0 - smoothstep(0.0, 70.0, p.y);
	COLOR = vec4(grain * (0.72 - inset * 0.40 - top * 0.12), 0.98);
}
