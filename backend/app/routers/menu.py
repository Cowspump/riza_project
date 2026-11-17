from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models import Category, MenuItem, User
from app.schemas import MenuItemOut

router = APIRouter(prefix="/api/menu", tags=["menu"])


@router.get("", response_model=list[MenuItemOut])
def list_menu(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.scalars(
        select(MenuItem)
        .join(MenuItem.category)
        .where(MenuItem.is_available.is_(True))
        .options(selectinload(MenuItem.category))
        .order_by(Category.sort_order, MenuItem.id)
    ).all()
    return [
        MenuItemOut(
            id=item.id,
            category=item.category.name,
            name=item.name,
            description=item.description,
            price=item.price,
            tone=item.tone,
        )
        for item in rows
    ]
