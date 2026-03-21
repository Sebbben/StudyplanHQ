import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createPlan, listPlansForUser } from "@/lib/plans/service";
import { plannerDraftSchema } from "@/lib/plans/schema";
import { assertSameOrigin } from "@/lib/security/request";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const plans = await listPlansForUser(session.userId);
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    await assertSameOrigin();
    const payload = plannerDraftSchema.parse(await request.json());
    const plan = await createPlan(session.userId, payload);

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create plan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
