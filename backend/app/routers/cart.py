from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_roles
from app.models import CartItem, MenuItem, User
from app.schemas import CartAddIn, CartOut, CartQtyIn
from app.serializers import cart_payload

router = APIRouter(prefix="/api/cart", tags=["cart"])


def _cart(db: Session, user_id: int) -> list[CartItem]:
    return list(
        db.scalars(
            select(CartItem)
            .where(CartItem.user_id == user_id)
            .options(selectinload(CartItem.menu_item))
            .order_by(CartItem.id)
        ).all()
    )


@router.get("", response_model=CartOut)
def get_cart(db: Session = Depends(get_db), user: User = Depends(require_roles("client"))):
    return cart_payload(_cart(db, user.id))


@router.post("", response_model=CartOut)
def add_to_cart(body: CartAddIn, db: Session = Depends(get_db), user: User = Depends(require_roles("client"))):
    dish = db.get(MenuItem, body.menu_item_id)
    if dish is None or not dish.is_available:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Этого блюда сейчас нет в меню.")
    row = db.scalar(
        select(CartItem).where(CartItem.user_id == user.id, CartItem.menu_item_id == dish.id)
    )
    if row is None:
        row = CartItem(user_id=user.id, menu_item_id=dish.id, quantity=body.quantity)
        db.add(row)
    else:
        row.quantity = min(20, row.quantity + body.quantity)
    db.commit()
    return cart_payload(_cart(db, user.id))


@router.patch("/{item_id}", response_model=CartOut)
def update_qty(
    item_id: int,
    body: CartQtyIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("client")),
):
    row = db.scalar(select(CartItem).where(CartItem.id == item_id, CartItem.user_id == user.id))
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Позиции нет в чеке.")
    if body.quantity == 0:
        db.delete(row)
    else:
        row.quantity = body.quantity
    db.commit()
    return cart_payload(_cart(db, user.id))
