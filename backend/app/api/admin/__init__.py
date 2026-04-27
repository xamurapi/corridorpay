from fastapi import APIRouter

from app.api.admin.dashboard import router as dashboard_router
from app.api.admin.users import router as users_router
from app.api.admin.transactions import router as tx_router
from app.api.admin.kyc import router as kyc_router
from app.api.admin.fx import router as fx_router
from app.api.admin.corridors import router as corridors_router
from app.api.admin.psp import router as psp_router
from app.api.admin.audit import router as audit_router

router = APIRouter()
router.include_router(dashboard_router)
router.include_router(users_router)
router.include_router(tx_router)
router.include_router(kyc_router)
router.include_router(fx_router)
router.include_router(corridors_router)
router.include_router(psp_router)
router.include_router(audit_router)
