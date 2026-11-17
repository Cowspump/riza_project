from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Category, MenuItem, User
from app.security import hash_password

MENU = [
    ("Супы", 1, [
        ("Шурпа", "Баранина, нут, редька, зелень", 2200, "broth"),
        ("Лагман", "Тянутая лапша, баранина, перец", 2400, "clay"),
    ]),
    ("Горячее", 2, [
        ("Плов чабанский", "Рис девзира, баранина, айва", 2600, "gold"),
        ("Манты", "Четыре штуки, лук, чёрный перец", 2100, "clay"),
        ("Казан-кебаб", "Баранина куском, картофель", 3200, "ember"),
    ]),
    ("Выпечка", 3, [
        ("Самса с бараниной", "Слоёное тесто, курдюк, зира", 700, "gold"),
        ("Лепёшка тандыр", "Тёплая, с кунжутом", 400, "clay"),
    ]),
    ("Напитки", 4, [
        ("Чай с чабрецом", "Чёрный чай, чабрец, изюм", 600, "herb"),
        ("Айран", "Солёный, холодный", 500, "herb"),
    ]),
]

STAFF = [
    ("admin@riza.kz", "+7 700 000 00 01", "Айгуль Серик", "admin"),
    ("kitchen@riza.kz", "+7 700 000 00 02", "Кухня Ризы", "restaurant"),
    ("courier@riza.kz", "+7 700 000 00 03", "Данияр Кулов", "courier"),
]


def seed(db: Session) -> None:
    if db.scalar(select(Category.id).limit(1)) is None:
        for name, sort_order, dishes in MENU:
            category = Category(name=name, sort_order=sort_order)
            db.add(category)
            db.flush()
            for dish_name, description, price, tone in dishes:
                db.add(
                    MenuItem(
                        category_id=category.id,
                        name=dish_name,
                        description=description,
                        price=price,
                        tone=tone,
                    )
                )

    if settings.seed_demo and db.scalar(select(User.id).where(User.role != "client").limit(1)) is None:
        for email, phone, full_name, role in STAFF:
            exists = db.scalar(select(User.id).where(User.email == email))
            if exists:
                continue
            db.add(
                User(
                    email=email,
                    phone=phone,
                    full_name=full_name,
                    password_hash=hash_password("riza-staff"),
                    role=role,
                )
            )
    db.commit()
