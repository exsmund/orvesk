extends "res://ui/modal_dialog.gd"
## The ordinary dialog shell; acknowledging and hiding are saved by the owner.
signal answered(hide_future: bool)
var error_label = Label.new()

func _init():
	super()
	name = "CombatHelp"
	title = "Как вести бой"
	ok_button_text = "Ок"
	cancel_button_text = "Больше не показывать"
	dialog_hide_on_ok = false
	secondary_is_action = true
	confirmed.connect(func(): answered.emit(false))
	alternative_confirmed.connect(func(): answered.emit(true))
	content.add_child(error_label)
	error_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	error_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	error_label.hide()

func configure(data):
	message.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	var armor_scale = str(data.balance.armorK).trim_suffix(".0")
	dialog_text = "Перетащите фигуры из набора на поле. Тап по фигуре поворачивает её; удержание открывает описание. Чтобы убрать свою фигуру, перетащите её с поля наружу.\n\nАтака наносит урон в занятых клетках. Перекройте её блоком или уклонением, чтобы избежать урона. Блок тратит выносливость за перекрытые атаки. При столкновении двух обычных атак обе наносят половину урона.\n\nУрон указан за одну клетку. Он зависит от предмета и характеристик; формула есть в карточке. Броня уменьшает урон: урон × %s / (%s + защита). Потери всех клеток складываются. Прогноз виден на поле и шкалах, подробный расчёт — при удержании клетки.\n\n«Пропустить ход» полностью восстанавливает выносливость после входящего урона, если герой выжил. Уберите свои фигуры; кнопка доступна при неполной выносливости.\n\nДля обычного хода расставьте фигуры и нажмите «Подтвердить ход». Если вы ходите первым, после раскрытия нажмите «Следующий ход»." % [armor_scale, armor_scale]
	error_label.add_theme_color_override("font_color", data.color("text-danger"))

func cancel():
	# Escape/Back acknowledges this battle, never selects 'do not show again'.
	if not closing: answered.emit(false)

func show_error(text: String):
	error_label.text = text
	error_label.show()
	arrange()
	scroll.set_deferred("scroll_vertical", int(scroll.get_v_scroll_bar().max_value))
