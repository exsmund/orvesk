shader_type canvas_item;
render_mode unshaded;
uniform vec4 top_color : source_color;
uniform vec4 upper_color : source_color;
uniform vec4 lower_color : source_color;
uniform vec4 bottom_color : source_color;
uniform vec4 center_color : source_color;

void fragment() {
	vec4 vertical = UV.y < 0.25 ? mix(top_color, upper_color, UV.y / 0.25)
		: (UV.y < 0.75 ? mix(upper_color, lower_color, (UV.y - 0.25) / 0.5)
		: mix(lower_color, bottom_color, (UV.y - 0.75) / 0.25));
	vec4 radial = center_color;
	radial.a *= 1.0 - smoothstep(0.0, 0.65, length(UV - vec2(0.5)));
	float alpha = vertical.a + radial.a * (1.0 - vertical.a);
	COLOR = vec4((vertical.rgb * vertical.a + radial.rgb * radial.a * (1.0 - vertical.a)) / max(alpha, 0.001), alpha);
}
