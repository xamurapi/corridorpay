from fastapi import APIRouter

from app.api.v1.cabinet.me import router as me_router
from app.api.v1.cabinet.wallets import router as wallets_router
from app.api.v1.cabinet.recipients import router as recipients_router
from app.api.v1.cabinet.transactions import router as transactions_router
from app.api.v1.cabinet.quotes import router as quotes_router
from app.api.v1.cabinet.kyc import router as kyc_router
from app.api.v1.cabinet.notifications import router as notifications_router
from app.api.v1.cabinet.support import router as support_router

router = APIRouter()
router.include_router(me_router)
router.include_router(wallets_router)
router.include_router(recipients_router)
router.include_router(transactions_router)
router.include_router(quotes_router)
router.include_router(kyc_router)
router.include_router(notifications_router)
router.include_router(support_router)
