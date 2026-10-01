shader_type canvas_item;
render_mode unshaded;
uniform vec4 gold : source_color;
uniform vec4 dark : source_color;
uniform bool selected = false;
void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r = length(p);
	float aa = max(fwidth(r), 0.008);
	float facing = dot(normalize(p + vec2(0.0001)), normalize(vec2(-0.6, -0.8)));
	float bevel = sin(clamp((r - 0.76) / 0.18, 0.0, 1.0) * 3.141593);
	vec3 rim = gold.rgb * (0.48 + 0.66 * bevel + 0.25 * facing);
	vec3 color = dark.rgb * (0.55 + 0.30 * max(0.0, facing));
	if (selected) {
		float z = sqrt(max(0.0, 1.0 - pow(r / 0.64, 2.0)));
		float diffuse = max(0.0, dot(normalize(vec3(p / 0.64, z)), normalize(vec3(-0.5, -0.6, 0.8))));
		float highlight = exp(-dot(p - vec2(-0.22, -0.25), p - vec2(-0.22, -0.25)) * 22.0);
		vec3 sphere = gold.rgb * (0.26 + 1.1 * diffuse) + gold.rgb * highlight * 0.65;
		color = mix(color, sphere, 1.0 - smoothstep(0.65 - aa, 0.65 + aa, r));
	}
	color = mix(color, rim, smoothstep(0.76 - aa, 0.76 + aa, r));
	color *= 1.0 - 0.72 * smoothstep(0.95, 1.0, r);
	COLOR = vec4(color, 1.0 - smoothstep(1.0 - aa, 1.0, r));
}
