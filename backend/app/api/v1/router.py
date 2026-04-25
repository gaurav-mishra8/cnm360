from fastapi import APIRouter
from app.api.v1 import auth, accounting, payroll, dashboard

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(accounting.router)
router.include_router(payroll.router)
router.include_router(dashboard.router)
