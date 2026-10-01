// Gaussian masks. Rectangle integral approach: Evan Wallace (CC0),
// https://madebyevan.com/shaders/fast-rounded-rectangle-shadows/
// Four sigma of padding leaves less than one alpha quantization step at the edge.
float gaussian_erf(float value) {
	float x = abs(value);
	float t = 1.0 + x * (0.278393 + x * (0.230389 + x * x * 0.078108));
	t *= t;
	return sign(value) * (1.0 - 1.0 / (t * t));
}
float gaussian_cdf(float distance, float sigma) {
	return 0.5 + 0.5 * gaussian_erf(distance / (1.41421356237 * max(0.01, sigma)));
}
float gaussian_box(vec2 p, vec2 lower, vec2 upper, float sigma) {
	float x = gaussian_cdf(upper.x - p.x, sigma) - gaussian_cdf(lower.x - p.x, sigma);
	float y = gaussian_cdf(upper.y - p.y, sigma) - gaussian_cdf(lower.y - p.y, sigma);
	return clamp(x * y, 0.0, 1.0);
}
