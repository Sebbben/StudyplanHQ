import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { deletePlan, getPlanById, updatePlan } from "@/lib/plans/service";
import { plannerDraftSchema } from "@/lib/plans/schema";
import { assertSameOrigin } from "@/lib/security/request";

type PlanRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: PlanRouteProps) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const planId = Number((await params).id);
  if (!Number.isInteger(planId)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const plan = await getPlanById(planId, session.userId);

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

export async function PATCH(request: Request, { params }: PlanRouteProps) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    await assertSameOrigin();
    const planId = Number((await params).id);
    const payload = plannerDraftSchema.parse(await request.json());

    if (!Number.isInteger(planId)) {
      return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
    }

    const plan = await updatePlan(planId, session.userId, payload);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update plan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: PlanRouteProps) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    await assertSameOrigin();
    const planId = Number((await params).id);

    if (!Number.isInteger(planId)) {
      return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
    }

    const plan = await deletePlan(planId, session.userId);

    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete plan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
