"""
Integração com o Stripe — plano único de R$127/mês.
"""
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.auth import get_current_user, require_company
from app.config import settings
from app.database import supabase

router = APIRouter(prefix="/billing", tags=["billing"])
stripe.api_key = settings.stripe_secret_key

_STRIPE_STATUS_MAP = {
    "active": "active",
    "trialing": "active",
    "past_due": "past_due",
    "unpaid": "past_due",
    "canceled": "canceled",
    "incomplete_expired": "canceled",
}


@router.get("/status")
async def billing_status(company_id: str = Depends(require_company)):
    r = supabase.table("companies").select("subscription_status").eq("id", company_id).single().execute()
    return {"status": (r.data or {}).get("subscription_status", "inactive")}


@router.post("/checkout-session")
async def create_checkout_session(
    user: dict = Depends(get_current_user),
    company_id: str = Depends(require_company),
):
    company_r = supabase.table("companies").select("name,stripe_customer_id").eq("id", company_id).single().execute()
    company = company_r.data or {}

    customer_id = company.get("stripe_customer_id")
    if not customer_id:
        admin_user = supabase.auth.admin.get_user_by_id(user["id"])
        email = getattr(admin_user.user, "email", None) if admin_user and admin_user.user else None
        customer = stripe.Customer.create(
            email=email,
            name=company.get("name") or None,
            metadata={"company_id": company_id},
        )
        customer_id = customer.id
        supabase.table("companies").update({"stripe_customer_id": customer_id}).eq("id", company_id).execute()

    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            payment_method_types=["card", "pix"],
            line_items=[{"price": settings.stripe_price_id, "quantity": 1}],
            success_url=f"{settings.frontend_url}/app/dashboard?checkout=success",
            cancel_url=f"{settings.frontend_url}/app/dashboard?checkout=cancel",
            metadata={"company_id": company_id},
            subscription_data={"metadata": {"company_id": company_id}},
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Falha ao iniciar checkout: {e}")

    return {"url": session.url}


def _update_company_from_subscription(subscription: dict) -> None:
    company_id = (subscription.get("metadata") or {}).get("company_id")
    new_status = _STRIPE_STATUS_MAP.get(subscription.get("status"), "inactive")
    update = {"subscription_status": new_status, "stripe_subscription_id": subscription.get("id")}

    query = supabase.table("companies").update(update)
    if company_id:
        query.eq("id", company_id).execute()
    elif subscription.get("customer"):
        query.eq("stripe_customer_id", subscription["customer"]).execute()


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Assinatura de webhook inválida")

    etype = event["type"]
    data = event["data"]["object"]

    if etype == "checkout.session.completed":
        company_id = (data.get("metadata") or {}).get("company_id")
        update = {"subscription_status": "active"}
        if data.get("subscription"):
            update["stripe_subscription_id"] = data["subscription"]
        if data.get("customer"):
            update["stripe_customer_id"] = data["customer"]
        if company_id:
            supabase.table("companies").update(update).eq("id", company_id).execute()

    elif etype in ("customer.subscription.created", "customer.subscription.updated"):
        _update_company_from_subscription(data)

    elif etype == "customer.subscription.deleted":
        company_id = (data.get("metadata") or {}).get("company_id")
        query = supabase.table("companies").update({"subscription_status": "canceled"})
        if company_id:
            query.eq("id", company_id).execute()
        elif data.get("customer"):
            query.eq("stripe_customer_id", data["customer"]).execute()

    return {"received": True}
