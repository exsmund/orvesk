extends "res://ui/character_page.gd"
const Frame = preload("res://ui/texture_frame.gd")
var equipment_only = false
var mannequin: TextureRect
var slots: Dictionary = {}
var captions: Dictionary = {}
var skills: Array = []
var skill_title: Label
var divider = preload("res://ui/textured_divider.gd").new()
const NAMES = {"ring": "Кольцо", "amulet": "Амулет", "body": "Тело", "weapon": "Правая", "shield": "Левая", "feet": "Ноги"}
const POSITIONS = {"ring": Vector2(14, 55), "amulet": Vector2(254, 55), "body": Vector2(134, 139), "weapon": Vector2(14, 245), "shield": Vector2(254, 245), "feet": Vector2(134, 345)}

func configure(owner_ui, actor: Dictionary = {}, inspected: Callable = Callable()):
	equipment_only = not actor.is_empty()
	setup(owner_ui)
	if equipment_only:
		mouse_filter = Control.MOUSE_FILTER_PASS
		canvas.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mannequin = picture(GothicTheme.trim_texture(preload("res://content/ui/equipment-mannequin-v2.png")))
	canvas.add_child(divider)
	divider.configure(host.data)
	var player = actor if equipment_only else host.session.game.player
	var inspect_item = inspected if inspected.is_valid() else host.show_item_details
	for slot in NAMES:
		if slot not in host.data.equipment_slots(player): continue
		var reference = player.gear.get(slot)
		var equipment = host.data.item(reference) if reference else {}
		var two_hands = slot == "shield" and host.data.item(player.gear.weapon).get("hands", 1) == 2
		var texture = host.data.image(host.data.art.get(equipment.get("templateId", ""), "")) if reference else null
		var button = slot_button(texture)
		button.tooltip_text = equipment.name if reference else ("Занято двуручным оружием" if two_hands else "Пустой слот: " + NAMES[slot])
		button.pressed.connect(func():
			if reference: inspect_item.call(reference)
			elif two_hands: inspect_item.call(player.gear.weapon)
			elif slot == "weapon" and not equipment_only: inspect_item.call(null)
			else: host.show_info(NAMES[slot], "Эта рука занята двуручным оружием." if two_hands else "Здесь пока нет предмета."))
		if equipment_only: button.mouse_filter = Control.MOUSE_FILTER_PASS
		button.disabled = equipment_only and not reference and not two_hands
		if two_hands:
			var mark = Label.new()
			mark.text = "2Р"
			mark.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			mark.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			mark.mouse_filter = Control.MOUSE_FILTER_IGNORE
			button.add_child(mark)
			mark.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		slots[slot] = button
		captions[slot] = label(NAMES[slot], 15)
	if equipment_only:
		arrange()
		return
	skill_title = label("Навыки", 18, true)
	for i in 3:
		var id = player.skills[i] if i < player.skills.size() else ""
		var skill = host.data.lookup(host.data.skills, id)
		var button = slot_button(host.data.image(skill.get("art", "")))
		button.tooltip_text = skill.get("name", "Пустой слот навыка")
		button.pressed.connect(func():
			if id: host.show_skill_details(id)
			else: host.show_info("Навык", "Новые навыки можно получить в награду за победу."))
		skills.append(button)
	arrange()

func slot_button(texture: Texture2D):
	var button = preload("res://ui/equipment_slot.gd").new()
	canvas.add_child(button)
	button.configure(host.data, texture)
	return button

func arrange():
	if not equipment_only:
		super.arrange()
		return
	wide = false
	design_size = Vector2(360, 410)
	var factor = maxf(0.01, minf(size.x / design_size.x, size.y / design_size.y))
	canvas.size = design_size
	canvas.scale = Vector2.ONE * factor
	canvas.position = (size - design_size * factor) / 2
	layout_content()

func layout_content():
	if not mannequin: return
	var factor = 0.68 if wide else 0.90
	var offset = Vector2(60, 2) if wide else Vector2(18, 0)
	put(mannequin, offset.x + 40 * factor, offset.y, 280 * factor, 445 * factor)
	for slot in slots:
		var point = offset + POSITIONS[slot] * factor
		put(slots[slot], point.x, point.y, 92 * factor, 92 * factor)
		put(captions[slot], point.x - 5, point.y - 24, 92 * factor + 10, 22)
	divider.visible = not wide and not equipment_only
	if equipment_only: return
	if wide:
		put(skill_title, 392, 4, 270, 26)
		for i in 3: put(skills[i], 483, 36 + i * 95, 90, 90)
	else:
		put(divider, 8, 418, 344, divider.THICKNESS)
		put(skill_title, 12, 430, 336, 26)
		for i in 3: put(skills[i], 10 + i * 116, 468, 108, 108)
